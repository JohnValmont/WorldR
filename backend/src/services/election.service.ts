import { db } from '../config/database';
import { electionRepository } from '../repositories/election.repository';
import { partyRepository } from '../repositories/party.repository';
import { nationRepository } from '../repositories/nation.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { NotFoundError } from '../utils/errors';
import { Knex } from 'knex';
import { ElectionsBalance } from '../systems/balance/elections.balance';

const ELECTION_CYCLE = ElectionsBalance.electionCycleMonths;

function getIdeologyCompatibility(id1: string, id2: string): number {
  if (id1 === id2) return 2;
  const compatibilities: Record<string, Record<string, number>> = {
    socialist: { social_democrat: 2, green: 2, centrist: 1, socialist: 2 },
    social_democrat: { socialist: 2, green: 2, centrist: 1, technocratic: 1, social_democrat: 2 },
    green: { socialist: 2, social_democrat: 2, technocratic: 1, centrist: 1, libertarian: 1, green: 2 },
    centrist: { social_democrat: 2, conservative: 2, centrist: 2, socialist: 1, green: 1, libertarian: 1, technocratic: 1, nationalist: 1 },
    conservative: { nationalist: 2, libertarian: 2, centrist: 2, technocratic: 1, conservative: 2 },
    nationalist: { conservative: 2, centrist: 1, nationalist: 2 },
    libertarian: { conservative: 2, centrist: 1, technocratic: 1, green: 1, libertarian: 2 },
    technocratic: { green: 2, social_democrat: 1, conservative: 1, centrist: 1, libertarian: 1, technocratic: 2 }
  };
  return compatibilities[id1]?.[id2] ?? -1;
}

export class ElectionService {
  /**
   * Determine if an election should run this tick.
   */
  public shouldRunElection(currentTick: number): boolean {
    return currentTick > 0 && currentTick % ELECTION_CYCLE === 0;
  }

  /**
   * Run the election for a nation at a given tick.
   * Uses D'Hondt proportional representation method.
   * Called from within the tick engine transaction.
   */
  public async runElection(nationId: string, tick: number, trx: Knex.Transaction): Promise<void> {
    const parties = await partyRepository.findByNationId(nationId, trx);
    const nation = await nationRepository.findById(nationId, trx);
    if (!nation) throw new NotFoundError('Nation not found for election');

    if (parties.length === 0) {
      // No parties — no election
      return;
    }

    const totalSeats = Number(nation.parliament_seats || 450);
    const populationSize = Number(nation.population_size || 82000000);

    // Create election record
    const election = await electionRepository.createElection({
      nation_id: nationId,
      tick,
      status: 'running',
      total_votes: 0,
      turnout_rate: 0,
      winning_party_id: null,
      coalition_formed: false
    }, trx);

    // Calculate vote shares from party support_share
    const totalSupport = parties.reduce((sum, p) => sum + Number(p.support_share), 0);
    const turnoutRate = 0.62 + (Number(nation.stability) - 0.5) * 0.2; // 62% base turnout
    const clampedTurnout = Math.max(0.45, Math.min(0.95, turnoutRate));
    const totalVotes = Math.round(populationSize * clampedTurnout);

    // D'Hondt seat allocation
    const partyVotes = parties.map(p => ({
      party: p,
      votes: totalSupport > 0
        ? Math.round((Number(p.support_share) / totalSupport) * totalVotes)
        : Math.round(totalVotes / parties.length)
    }));

    const seats = this.dHondt(partyVotes, totalSeats);
    const maxSeats = Math.max(...seats.map(s => s.seats));
    const winnerResult = seats.find(s => s.seats === maxSeats)!;
    const winningParty = winnerResult.party;

    // Determine governing coalition using ideological compatibility
    let governingPartyIds: string[] = [winningParty.id];
    let governingPartyAbbreviations: string[] = [winningParty.abbreviation];
    let coalitionFormed = false;

    if (winnerResult.seats >= totalSeats / 2 + 1) {
      coalitionFormed = false;
    } else {
      coalitionFormed = true;
      let combinedSeats = winnerResult.seats;
      
      const potentialPartners = seats
        .filter(s => s.party.id !== winningParty.id)
        .map(s => {
          const compatibility = getIdeologyCompatibility(winningParty.ideology || '', s.party.ideology || '');
          return { ...s, compatibility };
        })
        .filter(partner => partner.compatibility >= 0)
        .sort((a, b) => {
          if (b.compatibility !== a.compatibility) {
            return b.compatibility - a.compatibility;
          }
          return b.seats - a.seats;
        });

      for (const partner of potentialPartners) {
        combinedSeats += partner.seats;
        governingPartyIds.push(partner.party.id);
        governingPartyAbbreviations.push(partner.party.abbreviation);
        if (combinedSeats >= totalSeats / 2 + 1) {
          break;
        }
      }
    }

    // Reset all parties' governing status
    for (const p of parties) {
      await partyRepository.update(p.id, { is_governing: false, seats: 0, support_share: Number(p.support_share) }, trx);
    }

    // Insert results and update party seat counts
    for (const result of seats) {
      const voteShare = totalVotes > 0 ? result.votes / totalVotes : 0;
      const seatShare = totalSeats > 0 ? result.seats / totalSeats : 0;
      const isGoverning = governingPartyIds.includes(result.party.id);

      await electionRepository.createResult({
        election_id: election.id,
        party_id: result.party.id,
        party_name: result.party.name,
        party_abbreviation: result.party.abbreviation,
        party_color: result.party.color,
        votes: result.votes,
        vote_share: Number(voteShare.toFixed(4)),
        seats: result.seats,
        seat_share: Number(seatShare.toFixed(4)),
        is_governing: isGoverning
      }, trx);

      await partyRepository.update(result.party.id, {
        seats: result.seats,
        is_governing: isGoverning
      }, trx);
    }

    // Update governing coalition in nation.governance_data
    const governanceData = nation.governance_data || {};
    governanceData.governing_coalition = governingPartyAbbreviations;
    await nationRepository.update(nationId, {
      governance_data: governanceData
    }, trx);

    // Finalize election record
    await electionRepository.updateElection(election.id, {
      status: 'completed',
      total_votes: totalVotes,
      turnout_rate: Number(clampedTurnout.toFixed(4)),
      winning_party_id: winningParty.id,
      coalition_formed: coalitionFormed
    }, trx);

    // Send notifications to all members of the winning coalition parties
    const winnerMembers = await db('party_memberships')
      .whereIn('party_id', governingPartyIds);

    const combinedSeatsCount = seats.filter(s => governingPartyIds.includes(s.party.id)).reduce((sum, s) => sum + s.seats, 0);

    for (const member of winnerMembers) {
      await notificationRepository.create({
        user_id: member.user_id,
        nation_id: nationId,
        type: 'success',
        category: 'election',
        title: '🗳️ Governing Coalition Formed',
        message: `${winningParty.name} and partners formed a governing majority at Tick ${tick} with ${combinedSeatsCount} seats (${(combinedSeatsCount / totalSeats * 100).toFixed(1)}% of parliament). Coalition: ${governingPartyAbbreviations.join(', ')}.`,
        data: { electionId: election.id, seats: combinedSeatsCount }
      }, trx);
    }
  }

  /**
   * D'Hondt proportional seat allocation algorithm.
   */
  private dHondt(
    partyVotes: Array<{ party: any; votes: number }>,
    totalSeats: number
  ): Array<{ party: any; votes: number; seats: number }> {
    const results = partyVotes.map(pv => ({ ...pv, seats: 0 }));
    const divisors = results.map(() => 1);

    for (let i = 0; i < totalSeats; i++) {
      let maxQuotient = -1;
      let maxIndex = 0;
      for (let j = 0; j < results.length; j++) {
        const quotient = results[j].votes / divisors[j];
        if (quotient > maxQuotient) {
          maxQuotient = quotient;
          maxIndex = j;
        }
      }
      results[maxIndex].seats += 1;
      divisors[maxIndex] += 1;
    }

    return results;
  }

  public async getElectionHistory(nationId: string, limit = 5) {
    return electionRepository.findWithResultsByNationId(nationId, limit);
  }

  public async getLatestElection(nationId: string) {
    const election = await electionRepository.findLatestByNationId(nationId);
    if (!election) return null;
    const results = await electionRepository.findResultsByElectionId(election.id);
    return { election, results };
  }

  public async getElectionStatus(nationId: string) {
    const nation = await nationRepository.findById(nationId);
    if (!nation) throw new NotFoundError('Nation not found');

    const currentTick = nation.current_tick;
    const ticksSinceLastElection = currentTick % ELECTION_CYCLE;
    const nextElectionTick = currentTick + (ELECTION_CYCLE - ticksSinceLastElection);
    const ticksUntilNext = nextElectionTick - currentTick;

    const latest = await this.getLatestElection(nationId);
    const totalSeats = Number(nation.parliament_seats || 450);

    return {
      currentTick,
      electionCycle: ELECTION_CYCLE,
      nextElectionTick,
      ticksUntilNext,
      totalSeats,
      lastElection: latest
    };
  }
}

export const electionService = new ElectionService();

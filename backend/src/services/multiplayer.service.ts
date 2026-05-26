import { redis } from '../config/redis';
import { db } from '../config/database';
import { budgetRepository } from '../repositories/budget.repository';
import { taxRepository } from '../repositories/tax.repository';
import { lawRepository } from '../repositories/law.repository';
import { logger } from '../utils/logger';
import { ValidationError, UnauthorizedError } from '../utils/errors';

export const ROLES = {
  HEAD_OF_GOVERNMENT: 'head_of_government',
  FINANCE_MINISTER: 'finance_minister',
  ECONOMY_MINISTER: 'economy_minister',
  WELFARE_MINISTER: 'welfare_minister',
  INTERIOR_MINISTER: 'interior_minister',
  LABOR_MINISTER: 'labor_minister',
  PARLIAMENTARY_LEADER: 'parliamentary_leader',
  OPPOSITION_LEADER: 'opposition_leader',
  ADVISOR: 'advisor'
};

export const PERMISSIONS = {
  ASSIGN_ROLES: 'assign_roles',
  PROPOSE_BUDGET: 'propose_budget',
  PROPOSE_TAX: 'propose_tax',
  PROPOSE_LAW: 'propose_law',
  VETO_BILL: 'veto_bill',
  DECLARE_EMERGENCY: 'declare_emergency',
  POLICE_CRACKDOWN: 'police_crackdown',
  MANAGE_WAGES: 'manage_wages',
  SCHEDULE_VOTES: 'schedule_votes',
  TRIGGER_TICK: 'trigger_tick'
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLES.HEAD_OF_GOVERNMENT]: [
    PERMISSIONS.ASSIGN_ROLES,
    PERMISSIONS.VETO_BILL,
    PERMISSIONS.DECLARE_EMERGENCY,
    PERMISSIONS.TRIGGER_TICK
  ],
  [ROLES.FINANCE_MINISTER]: [
    PERMISSIONS.PROPOSE_BUDGET,
    PERMISSIONS.PROPOSE_TAX
  ],
  [ROLES.ECONOMY_MINISTER]: [
    PERMISSIONS.PROPOSE_LAW
  ],
  [ROLES.WELFARE_MINISTER]: [
    PERMISSIONS.PROPOSE_BUDGET
  ],
  [ROLES.INTERIOR_MINISTER]: [
    PERMISSIONS.POLICE_CRACKDOWN,
    PERMISSIONS.PROPOSE_LAW
  ],
  [ROLES.LABOR_MINISTER]: [
    PERMISSIONS.MANAGE_WAGES,
    PERMISSIONS.PROPOSE_LAW
  ],
  [ROLES.PARLIAMENTARY_LEADER]: [
    PERMISSIONS.SCHEDULE_VOTES
  ],
  [ROLES.OPPOSITION_LEADER]: [
    PERMISSIONS.PROPOSE_LAW
  ],
  [ROLES.ADVISOR]: []
};

export class MultiplayerService {
  private getCabinetKey(nationId: string): string {
    return `cabinet:${nationId}`;
  }

  private getUserToRoleKey(nationId: string, userId: string): string {
    return `user_to_role:${nationId}:${userId}`;
  }

  // Socket reference to emit live updates
  private ioServer: any = null;

  public setSocketServer(io: any) {
    this.ioServer = io;
  }

  private broadcastToRoom(nationId: string, event: string, data: any) {
    if (this.ioServer) {
      this.ioServer.to(`nation:${nationId}`).emit(event, data);
    }
  }

  public async getCabinet(nationId: string): Promise<Record<string, string>> {
    const key = this.getCabinetKey(nationId);
    return await redis.hgetall(key);
  }

  public async getUserRole(nationId: string, userId: string): Promise<string | null> {
    const key = this.getUserToRoleKey(nationId, userId);
    return await redis.get(key);
  }

  public async assignRole(
    nationId: string,
    assignerId: string,
    targetUserId: string,
    role: string
  ): Promise<void> {
    if (!Object.values(ROLES).includes(role)) {
      throw new ValidationError(`Invalid cabinet role: ${role}`);
    }

    const cabinet = await this.getCabinet(nationId);
    const existingHead = cabinet[ROLES.HEAD_OF_GOVERNMENT];

    // Bootstrap rule: if there is no Head of Government, anyone can claim it
    if (existingHead && existingHead !== assignerId) {
      const assignerRole = await this.getUserRole(nationId, assignerId);
      if (assignerRole !== ROLES.HEAD_OF_GOVERNMENT) {
        throw new UnauthorizedError('Only the Head of Government can assign cabinet roles');
      }
    }

    const cabinetKey = this.getCabinetKey(nationId);
    const userToRoleKey = this.getUserToRoleKey(nationId, targetUserId);

    // Remove user's previous role if any
    const oldRole = await this.getUserRole(nationId, targetUserId);
    if (oldRole) {
      await redis.hdel(cabinetKey, oldRole);
    }

    // Remove any user currently holding the target role
    const currentHolder = cabinet[role];
    if (currentHolder) {
      await redis.del(this.getUserToRoleKey(nationId, currentHolder));
    }

    // Set new assignments
    await redis.hset(cabinetKey, role, targetUserId);
    await redis.set(userToRoleKey, role);

    // Audit log
    await db('audit_logs').insert({
      nation_id: nationId,
      user_id: assignerId,
      action: 'ASSIGN_CABINET_ROLE',
      target_type: 'nation',
      target_id: targetUserId,
      new_values: JSON.stringify({ role }),
      created_at: new Date()
    });

    logger.info(`[MultiplayerService] Assigned ${targetUserId} to role ${role} in nation ${nationId}`);
    
    // Broadcast cabinet update
    const updatedCabinet = await this.getCabinet(nationId);
    this.broadcastToRoom(nationId, 'cabinet:updated', { cabinet: updatedCabinet });
  }

  public async checkPermission(nationId: string, userId: string, permission: string): Promise<boolean> {
    const role = await this.getUserRole(nationId, userId);
    if (!role) return false;
    return (ROLE_PERMISSIONS[role] || []).includes(permission);
  }

  public async createProposal(
    nationId: string,
    proposerId: string,
    type: 'budget' | 'tax' | 'law',
    details: any,
    title: string,
    timeoutMs: number = 60000
  ): Promise<any> {
    // Permission check based on proposal type
    let hasPermission = false;
    if (type === 'budget') {
      hasPermission = await this.checkPermission(nationId, proposerId, PERMISSIONS.PROPOSE_BUDGET);
    } else if (type === 'tax') {
      hasPermission = await this.checkPermission(nationId, proposerId, PERMISSIONS.PROPOSE_TAX);
    } else if (type === 'law') {
      hasPermission = await this.checkPermission(nationId, proposerId, PERMISSIONS.PROPOSE_LAW);
    }

    if (!hasPermission) {
      throw new UnauthorizedError(`You do not have permission to propose a ${type}`);
    }

    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const proposalKey = `proposal:${nationId}:${proposalId}`;

    const proposalData = {
      id: proposalId,
      nationId,
      proposerId,
      type,
      title,
      details: JSON.stringify(details),
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + timeoutMs).toISOString()
    };

    // Store in Redis with TTL to auto-cleanup
    await redis.hmset(proposalKey, proposalData);
    await redis.pexpire(proposalKey, timeoutMs + 10000);
    await redis.sadd(`proposals:${nationId}`, proposalId);

    logger.info(`[MultiplayerService] Created ${type} proposal ${proposalId} in nation ${nationId}`);

    this.broadcastToRoom(nationId, 'proposal:created', proposalData);

    // Setup auto-resolve timer
    setTimeout(async () => {
      try {
        const prop = await redis.hgetall(proposalKey);
        if (prop && prop.status === 'active') {
          await this.resolveProposal(nationId, proposalId);
        }
      } catch (err) {
        logger.error(`Error in proposal auto-resolve timer for ${proposalId}:`, err);
      }
    }, timeoutMs);

    return proposalData;
  }

  public async getActiveProposals(nationId: string): Promise<any[]> {
    const ids = await redis.smembers(`proposals:${nationId}`);
    const proposals: any[] = [];
    for (const id of ids) {
      const prop = await redis.hgetall(`proposal:${nationId}:${id}`);
      if (prop && prop.status === 'active') {
        const votes = await redis.hgetall(`votes:${nationId}:${id}`);
        proposals.push({
          ...prop,
          details: JSON.parse(prop.details),
          votes
        });
      }
    }
    return proposals;
  }

  public async castVote(
    nationId: string,
    userId: string,
    proposalId: string,
    option: 'yes' | 'no' | 'abstain'
  ): Promise<any> {
    const proposalKey = `proposal:${nationId}:${proposalId}`;
    const proposal = await redis.hgetall(proposalKey);

    if (!proposal || proposal.status !== 'active') {
      throw new ValidationError('Proposal is not active or has already been resolved');
    }

    const userRole = await this.getUserRole(nationId, userId);
    if (!userRole) {
      throw new UnauthorizedError('Only active cabinet ministers can vote on proposals');
    }

    const votesKey = `votes:${nationId}:${proposalId}`;
    await redis.hset(votesKey, userId, option);

    logger.info(`[MultiplayerService] User ${userId} voted ${option} on proposal ${proposalId}`);

    const allVotes = await redis.hgetall(votesKey);
    this.broadcastToRoom(nationId, 'vote:updated', { proposalId, votes: allVotes });

    // Check if consensus is reached (i.e. all active cabinet members have voted)
    const cabinet = await this.getCabinet(nationId);
    const votingMembers = Object.values(cabinet).filter(v => v !== '');
    const votesCount = Object.keys(allVotes).length;

    if (votesCount >= votingMembers.length) {
      // Auto-resolve immediately if all active members voted
      return await this.resolveProposal(nationId, proposalId);
    }

    return { proposalId, status: 'active', votes: allVotes };
  }

  public async resolveProposal(nationId: string, proposalId: string): Promise<any> {
    const proposalKey = `proposal:${nationId}:${proposalId}`;
    const proposal = await redis.hgetall(proposalKey);

    if (!proposal || proposal.status !== 'active') {
      return { proposalId, status: 'resolved' };
    }

    const votesKey = `votes:${nationId}:${proposalId}`;
    const allVotes = await redis.hgetall(votesKey);

    let yesVotes = 0;
    let noVotes = 0;
    for (const [userId, vote] of Object.entries(allVotes)) {
      if (vote === 'yes') yesVotes++;
      if (vote === 'no') noVotes++;
    }

    const passed = yesVotes > noVotes;
    const finalStatus = passed ? 'passed' : 'failed';

    // Update status in Redis
    await redis.hset(proposalKey, 'status', finalStatus);
    await redis.srem(`proposals:${nationId}`, proposalId);

    // Enact changes in DB if passed
    if (passed) {
      const details = JSON.parse(proposal.details);
      await db.transaction(async (trx) => {
        if (proposal.type === 'budget') {
          const currentBudgets = await budgetRepository.findByNationId(nationId, trx);
          for (const item of details.budgets || []) {
            const matched = currentBudgets.find(b => b.name === item.name);
            if (matched) {
              await budgetRepository.update(matched.id, { allocation: item.allocation }, trx);
            }
          }
        } else if (proposal.type === 'tax') {
          const currentTaxes = await taxRepository.findByNationId(nationId, trx);
          for (const item of details.taxes || []) {
            const matched = currentTaxes.find(t => t.name === item.name);
            if (matched) {
              await taxRepository.update(matched.id, { rate: item.rate }, trx);
            }
          }
        } else if (proposal.type === 'law') {
          const newLaw = await lawRepository.create({
            nation_id: nationId,
            title: details.title,
            description: details.description || null,
            status: 'passed'
          }, trx);

          for (const effect of details.effects || []) {
            await lawRepository.createEffect({
              law_id: newLaw.id,
              target_type: effect.target_type,
              target_name: effect.target_name,
              parameter_name: effect.parameter_name,
              modifier_type: effect.modifier_type,
              modifier_value: effect.modifier_value
            }, trx);
          }
        }
      });
      logger.info(`[MultiplayerService] Proposal ${proposalId} passed and enacted successfully`);
    } else {
      logger.info(`[MultiplayerService] Proposal ${proposalId} rejected`);
    }

    // Log resolve audit
    await db('audit_logs').insert({
      nation_id: nationId,
      action: passed ? 'ENACT_PROPOSAL_PASSED' : 'ENACT_PROPOSAL_REJECTED',
      target_type: 'nation',
      target_id: proposalId,
      new_values: JSON.stringify({ yesVotes, noVotes, type: proposal.type }),
      created_at: new Date()
    });

    const result = {
      proposalId,
      status: finalStatus,
      yesVotes,
      noVotes,
      type: proposal.type
    };

    this.broadcastToRoom(nationId, 'proposal:resolved', result);

    // Clean up Redis keys after some delay
    await redis.pexpire(votesKey, 60000);
    await redis.pexpire(proposalKey, 60000);

    return result;
  }

  // Negotiations
  public async createNegotiation(
    nationId: string,
    senderId: string,
    receiverId: string,
    terms: any
  ): Promise<any> {
    const negotiationId = `neg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const negotiationKey = `negotiation:${nationId}:${negotiationId}`;

    const negotiationData = {
      id: negotiationId,
      nationId,
      senderId,
      receiverId,
      terms: JSON.stringify(terms),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await redis.hmset(negotiationKey, negotiationData);
    await redis.sadd(`negotiations:${nationId}`, negotiationId);

    logger.info(`[MultiplayerService] Created negotiation deal ${negotiationId} from ${senderId} to ${receiverId}`);

    this.broadcastToRoom(nationId, 'negotiation:created', {
      ...negotiationData,
      terms
    });

    return negotiationData;
  }

  public async getActiveNegotiations(nationId: string): Promise<any[]> {
    const ids = await redis.smembers(`negotiations:${nationId}`);
    const negotiations: any[] = [];
    for (const id of ids) {
      const neg = await redis.hgetall(`negotiation:${nationId}:${id}`);
      if (neg && neg.status === 'pending') {
        negotiations.push({
          ...neg,
          terms: JSON.parse(neg.terms)
        });
      }
    }
    return negotiations;
  }

  public async respondToNegotiation(
    nationId: string,
    receiverId: string,
    negotiationId: string,
    status: 'accepted' | 'declined'
  ): Promise<any> {
    const negotiationKey = `negotiation:${nationId}:${negotiationId}`;
    const neg = await redis.hgetall(negotiationKey);

    if (!neg || neg.status !== 'pending') {
      throw new ValidationError('Negotiation deal not found or already completed');
    }

    if (neg.receiverId !== receiverId) {
      throw new UnauthorizedError('You are not authorized to respond to this negotiation');
    }

    await redis.hset(negotiationKey, 'status', status);
    await redis.srem(`negotiations:${nationId}`, negotiationId);

    logger.info(`[MultiplayerService] Negotiation ${negotiationId} responded with ${status}`);

    const result = {
      negotiationId,
      status,
      senderId: neg.senderId,
      receiverId: neg.receiverId
    };

    this.broadcastToRoom(nationId, 'negotiation:resolved', result);

    // Audit log
    await db('audit_logs').insert({
      nation_id: nationId,
      action: status === 'accepted' ? 'NEGOTIATION_ACCEPTED' : 'NEGOTIATION_DECLINED',
      target_type: 'nation',
      target_id: negotiationId,
      created_at: new Date()
    });

    await redis.pexpire(negotiationKey, 60000);

    return result;
  }
}

export const multiplayerService = new MultiplayerService();

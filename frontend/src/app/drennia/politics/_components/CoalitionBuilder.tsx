'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { T, MONO, HEADING, SANS, glassPanelStyle } from '../_lib/theme';
import { type JurisdictionId } from '../_lib/session';

const primaryButtonStyle: React.CSSProperties = {
  border: 'none', borderRadius: 6, fontWeight: 600, fontFamily: SANS, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
const secondaryButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: T.ivory, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
};
import { Users, AlertCircle, Check, X, Shield, Plus, Clock } from 'lucide-react';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  myParty: any;
  partySeats: { party_id: string; seats: number }[];
  parties: any[]; // Full party list to resolve names/colors
  majority: number;
  totalSeats: number;
  onRefresh?: () => void;
}

export default function CoalitionBuilder({ selectedJurisdictionId, myParty, partySeats, parties, majority, totalSeats, onRefresh }: Props) {
  const { data: formationData, mutate } = useSWR(
    ['forming-coalition', selectedJurisdictionId],
    () => politicsApi.getFormingCoalition(selectedJurisdictionId)
  );

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const coalition = formationData?.coalition;
  if (!coalition) {
    return (
      <div style={{ ...glassPanelStyle, padding: '24px', textAlign: 'center', color: T.faint }}>
        <AlertCircle size={24} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
        <p style={{ fontFamily: HEADING, fontSize: 16, color: T.ivory, marginBottom: 4 }}>No Coalition Forming</p>
        <p style={{ fontSize: 13 }}>There is no active government formation process at this time.</p>
      </div>
    );
  }

  const { formateur, invited } = coalition;
  // Exclude the formateur from accepted to avoid duplicate display
  const accepted: any[] = (coalition.accepted ?? []).filter((p: any) => p.id !== formateur?.id);

  const isFormateur = myParty && formateur?.id === myParty.id;
  const amInvited = myParty && invited.some((p: any) => p.id === myParty.id);
  const amAccepted = myParty && accepted.some((p: any) => p.id === myParty.id);

  const acceptedSeats = (formateur?.seats || 0) + accepted.reduce((sum: number, p: any) => sum + (p.seats || 0), 0);
  const invitedSeats = invited.reduce((sum: number, p: any) => sum + (p.seats || 0), 0);
  const totalPotentialSeats = acceptedSeats + invitedSeats;

  const handleAction = async (action: 'invite' | 'accept' | 'decline', targetPartyId: string) => {
    setFeedback(null);
    try {
      setLoadingAction(`${action}-${targetPartyId}`);
      await politicsApi.manageCoalition(action, targetPartyId, selectedJurisdictionId);
      const successMsg = action === 'invite' ? 'Invitation sent.' : action === 'accept' ? 'Joined coalition.' : 'Invitation declined.';
      setFeedback({ ok: true, msg: successMsg });
      await mutate();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setFeedback({ ok: false, msg: err?.response?.data?.message || err.message || 'Action failed.' });
    } finally {
      setLoadingAction(null);
    }
  };

  const getPartyDetails = (id: string) => parties.find(p => p.id === id);

  // Available to invite (for formateur)
  const availableToInvite = partySeats
    .filter(ps => ps.party_id !== formateur?.id && !accepted.some((a: any) => a.id === ps.party_id) && !invited.some((i: any) => i.id === ps.party_id))
    .map(ps => ({ ...ps, details: getPartyDetails(ps.party_id) }))
    .filter(p => p.details);

  return (
    <div style={{
      ...glassPanelStyle,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.05) 0%, rgba(10, 12, 16, 0.9) 100%)',
      borderTop: `1px solid ${T.mint}`,
      boxShadow: `0 4px 24px ${T.mint}10, inset 0 1px 0 rgba(255,255,255,0.05)`,
    }}>
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        background: 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: T.mint }}>
          <Shield size={14} /> Coalition Formation
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: T.faint }}>
          Majority: {majority} Seats
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        
        {/* Progress Bar */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontFamily: MONO, fontSize: 12 }}>
            <span style={{ color: T.ivory }}>{acceptedSeats} / {majority} Confirmed</span>
            <span style={{ color: T.faint }}>Potential: {totalPotentialSeats}</span>
          </div>
          <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${Math.min(100, (acceptedSeats / totalSeats) * 100)}%`, background: T.mint, transition: 'width 0.5s ease' }} />
            <div style={{ width: `${Math.min(100, (invitedSeats / totalSeats) * 100)}%`, background: T.warning, opacity: 0.5, transition: 'width 0.5s ease' }} />
          </div>
          {acceptedSeats >= majority && (
            <div style={{ marginTop: 8, color: T.mint, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={14} /> Majority Reached. The government will form successfully at the end of the phase.
            </div>
          )}
        </div>

        {/* Member List */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          
          {/* Confirmed Members */}
          <div>
            <h4 style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 12 }}>Confirmed Partners</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              
              {/* Formateur */}
              {formateur && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, borderLeft: `2px solid ${T.mint}` }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: T.ivory, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {formateur.name} <span style={{ padding: '2px 6px', background: `${T.mint}20`, color: T.mint, borderRadius: 4, fontSize: 10, fontFamily: MONO }}>FORMATEUR</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.faint, fontFamily: MONO, marginTop: 2 }}>{formateur.seats} Seats</div>
                  </div>
                </div>
              )}

              {/* Accepted */}
              {accepted.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: T.ivory }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: T.faint, fontFamily: MONO, marginTop: 2 }}>{p.seats} Seats</div>
                  </div>
                  <Check size={16} color={T.mint} />
                </div>
              ))}

              {accepted.length === 0 && (
                <div style={{ padding: '10px 12px', color: T.faint, fontSize: 12, fontStyle: 'italic' }}>No partners joined yet.</div>
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          <div>
            <h4 style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint, marginBottom: 12 }}>Pending Invitations</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invited.map((p: any) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: T.ivory }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: T.faint, fontFamily: MONO, marginTop: 2 }}>{p.seats} Seats</div>
                  </div>
                  <Clock size={16} color={T.warning} />
                </div>
              ))}
              {invited.length === 0 && (
                <div style={{ padding: '10px 12px', color: T.faint, fontSize: 12, fontStyle: 'italic' }}>No pending invitations.</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div style={{ padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
          
          {amInvited && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: T.warning, fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={16} /> You have been invited to join the coalition!
                </div>
                <div style={{ color: T.faint, fontSize: 12, marginTop: 4 }}>
                  Joining the coalition means you will vote as a bloc with the government.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  style={{ ...secondaryButtonStyle, padding: '6px 12px', background: 'rgba(239,68,68,0.1)', color: T.red, border: `1px solid ${T.red}40` }}
                  onClick={() => handleAction('decline', myParty.id)}
                  disabled={!!loadingAction}
                >
                  <X size={14} style={{ marginRight: 6 }} /> Decline
                </button>
                <button 
                  style={{ ...primaryButtonStyle, padding: '6px 12px', background: `linear-gradient(180deg, ${T.mint}, #059669)` }}
                  onClick={() => handleAction('accept', myParty.id)}
                  disabled={!!loadingAction}
                >
                  <Check size={14} style={{ marginRight: 6 }} /> Accept
                </button>
              </div>
            </div>
          )}

          {amAccepted && !isFormateur && (
            <div style={{ color: T.mint, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={16} /> You are a confirmed member of this forming coalition.
            </div>
          )}

          {isFormateur && (
            <div>
              <h4 style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, color: T.ivory, marginBottom: 12 }}>Invite Parties</h4>
              {availableToInvite.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {availableToInvite.map(p => (
                    <button
                      key={p.party_id}
                      onClick={() => handleAction('invite', p.party_id)}
                      disabled={!!loadingAction}
                      style={{
                        ...secondaryButtonStyle,
                        padding: '6px 12px',
                        display: 'flex', alignItems: 'center', gap: 6,
                        opacity: loadingAction ? 0.5 : 1
                      }}
                    >
                      <Plus size={14} color={T.blueLine} />
                      <span style={{ fontSize: 13 }}>{p.details?.abbreviation || p.details?.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: T.faint, marginLeft: 4 }}>({p.seats})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>No other parties available to invite.</div>
              )}
            </div>
          )}

          {!myParty && (
            <div style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>You must be a party leader to participate in coalition formation.</div>
          )}
          
          {myParty && !isFormateur && !amInvited && !amAccepted && (
            <div style={{ color: T.faint, fontSize: 13, fontStyle: 'italic' }}>Waiting for an invitation from the Formateur ({formateur?.name}).</div>
          )}

        </div>

        {/* Inline feedback */}
        {feedback && (
          <div style={{
            marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', borderRadius: 7,
            background: feedback.ok ? 'rgba(16,214,122,0.08)' : 'rgba(220,38,38,0.08)',
            border: `1px solid ${feedback.ok ? 'rgba(16,214,122,0.25)' : 'rgba(220,38,38,0.25)'}`,
            color: feedback.ok ? T.mint : T.red, fontSize: 13, fontFamily: SANS,
          }}>
            {feedback.ok ? <Check size={14} /> : <AlertCircle size={14} />}
            {feedback.msg}
          </div>
        )}

      </div>
    </div>
  );
}

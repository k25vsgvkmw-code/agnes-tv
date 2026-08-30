export type Capability = 'calendar_changes';

export type RequestedAutonomy = 'view' | 'suggest' | 'prepare' | 'act';
export type ActGrant = boolean | 'requires_confirmation';

export interface CapabilityGrant {
  readonly view: boolean;
  readonly suggest: boolean;
  readonly act: ActGrant;
}

export interface PolicyDecision {
  readonly capability: Capability;
  readonly requested: RequestedAutonomy;
  readonly allowed: boolean;
  readonly requiresConfirmation: boolean;
}

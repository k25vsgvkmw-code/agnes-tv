export type CapabilityName = string;
export type CapabilityRequest = 'view' | 'suggest' | 'act';
export type ActGrant = 'allowed' | 'requires_confirmation' | 'denied';

export interface CapabilityGrant {
  readonly view: boolean;
  readonly suggest: boolean;
  readonly act: ActGrant;
}

export interface CapabilityEvaluationInput {
  readonly capability: CapabilityName;
  readonly requested: CapabilityRequest;
  readonly grant: CapabilityGrant;
}

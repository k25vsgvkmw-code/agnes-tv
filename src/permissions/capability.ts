export type CapabilityAction = 'view' | 'suggest' | 'act';
export type ActGrant = boolean | 'requires_confirmation';

export interface CapabilityGrant {
  readonly view: boolean;
  readonly suggest: boolean;
  readonly act: ActGrant;
}

export interface CapabilityRequest {
  readonly capability: string;
  readonly requested: CapabilityAction;
  readonly grant: CapabilityGrant;
}

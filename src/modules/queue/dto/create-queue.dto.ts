export class CreateQueueDto {
  customerName: string;
  tel: string;
  industry: string;     // Used to select Config (Workflow Code)
  profileId?: string;   // Branch/Profile ID
  agnCode?: string;     // Agency/Company Code
  refId?: string;       // Optional Reference ID
  refType?: string;     // Optional Reference Type
  attributes?: Record<string, any>;

  bchCode?: string;
  preFix?: string;
  customerType?: string;
}

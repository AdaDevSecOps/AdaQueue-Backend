export class CreateQueueDto {
  customerName: string;
  tel: string;
  industry: string;     // Used to select Config (Workflow Code)
  profileId?: string;   // Branch/Profile ID
  agnCode?: string;     // Agency/Company Code
  
  refId?: string;       // Optional Reference ID
  refType?: string;     // Optional Reference Type
  
  // Dynamic Attributes
  // Users can pass arbitrary data here, e.g., { "symptom": "fever", "tableSize": 4 }
  attributes?: Record<string, any>;
}

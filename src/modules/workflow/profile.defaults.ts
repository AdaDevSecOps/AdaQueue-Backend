export interface IServicePoint {
    code: string;
    name: string;
    description?: string;
    focusStates: string[]; 
    serviceGroups?: string[];
  }
  
  export interface IKioskDefinition {
    code: string;
    name: string;
    description?: string;
    title?: string; // Display Title on Kiosk Screen
    visibleServiceGroups: string[]; // Queue Types visible on this kiosk
  }
  
  export interface IDisplayBoardDefinition {
    code: string;
    name: string;
    description?: string;
    title?: string; // Display Title on Board
    visibleServiceGroups: string[]; // Queue Types visible on this board
  }
  
  export interface IProfileConfig {
    servicePoints: IServicePoint[];
    kiosks: IKioskDefinition[];
    displayBoards: IDisplayBoardDefinition[];
  }
  
  export const DEFAULT_PROFILES = [
    {
      code: "PF-REST-001",
      name: "AdaCafe Main Branch",
      config: {
        servicePoints: [
          { 
            code: "SP-01", 
            name: "Reception Counter", 
            focusStates: ["WAIT_TABLE"],
            serviceGroups: ["GRP_1", "GRP_2"]
          }
        ],
        kiosks: [
          { 
            code: "K-01", 
            name: "Entrance Kiosk", 
            title: "Welcome to AdaCafe",
            visibleServiceGroups: ["GRP_1", "GRP_2"] 
          }
        ],
        displayBoards: [
             {
                code: "DB-01",
                name: "Main Hall TV",
                title: "Queue Status",
                visibleServiceGroups: ["GRP_1", "GRP_2"]
             }
        ]
      }
    }
  ];
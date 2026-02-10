
import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowConfigService } from '../modules/workflow/workflow-config.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProfileEntity } from '../modules/workflow/entities/profile.entity';
import { WorkflowEntity } from '../modules/workflow/entities/workflow.entity';
import { Repository } from 'typeorm';

// Mock Repository
const mockProfileRepo = {
  findOne: jest.fn(),
  save: jest.fn((entity) => Promise.resolve(entity)),
  count: jest.fn(),
};

const mockWorkflowRepo = {
    count: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
};

async function runTest() {
  console.log('--- Testing Create Profile Logic ---');
  
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      WorkflowConfigService,
      {
        provide: getRepositoryToken(ProfileEntity),
        useValue: mockProfileRepo,
      },
      {
        provide: getRepositoryToken(WorkflowEntity),
        useValue: mockWorkflowRepo,
      },
    ],
  }).compile();

  const service = module.get<WorkflowConfigService>(WorkflowConfigService);

  // Test Data
  const profileId = 'TEST-PRF-001';
  const profileName = 'Test Profile';
  const config = { some: 'config' };
  const agnCode = 'AGN001';

  try {
    console.log(`Attempting to save profile: ${profileId}`);
    // Simulate what Controller calls
    const result = await service.saveProfile(profileId, profileName, config, agnCode);
    
    console.log('Save successful!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.code === profileId && result.name === profileName && result.agnCode === agnCode) {
        console.log('PASS: Profile saved with correct attributes.');
    } else {
        console.error('FAIL: Saved attributes mismatch.');
    }

    // Verify mock calls
    console.log('Mock Repo Save called:', mockProfileRepo.save.mock.calls.length);

  } catch (error) {
    console.error('FAIL: Exception thrown during saveProfile:', error);
  }
}

runTest();

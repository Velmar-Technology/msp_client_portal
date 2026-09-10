import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentGatewayController } from './AgentGatewayController';
import { agentGateway } from '@modules/rmm/services/AgentGateway';
import { ValidationError } from '@shared/errors';

vi.mock('@modules/rmm/services/AgentGateway', () => ({
  agentGateway: {
    sendCommand: vi.fn(),
    getAgentStatus: vi.fn(),
    getConnectedAgents: vi.fn(),
  },
}));

vi.mock('@modules/equipment', () => ({
  equipmentService: {
    resolveAgentIdForSlot: vi.fn().mockImplementation((id: string) => Promise.resolve(id)),
  },
}));

describe('AgentGatewayController', () => {
  let controller: AgentGatewayController;
  const mockEquipmentSvc: any = {
    resolveAgentIdForSlot: vi.fn().mockImplementation((id: string) => Promise.resolve(id)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AgentGatewayController(mockEquipmentSvc);
  });

  describe('upgradeAgent', () => {
    it('should successfully dispatch AGENT_UPGRADE and return confirmation', async () => {
      const mockResult = { success: true, status: 'UPGRADE_PREPARED' };
      vi.mocked(agentGateway.sendCommand).mockResolvedValueOnce(mockResult);

      const req: any = {
        params: { equipmentId: '3fa85f64-5717-4562-b3fc-2c963f66afa6' },
        body: {
          targetVersion: '1.10.2',
          rollbackTimeoutSecs: 60,
        },
      };

      const res: any = {
        json: vi.fn(),
      };

      await controller.upgradeAgent(req, res);

      expect(agentGateway.sendCommand).toHaveBeenCalledWith(
        '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        'AGENT_UPGRADE',
        expect.objectContaining({
          target_version: '1.10.2',
          rollback_timeout_secs: 60,
          download_url: 'https://helpdesk.velmartech.com.do/dl/msp-agent-1.10.2.exe',
        }),
        30000
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Agent upgrade initiated successfully',
          equipmentId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          targetVersion: '1.10.2',
          rollbackTimeoutSecs: 60,
          agentResponse: mockResult,
        })
      );
    });

    it('should throw ValidationError on invalid UUID', async () => {
      const req: any = {
        params: { equipmentId: 'invalid-uuid' },
        body: {},
      };
      const res: any = { json: vi.fn() };

      await expect(controller.upgradeAgent(req, res)).rejects.toThrow(ValidationError);
    });
  });
});

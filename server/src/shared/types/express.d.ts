import { JwtPayload, AgentPayload } from '@shared/types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      agent?: AgentPayload;
    }
  }
}

export {};

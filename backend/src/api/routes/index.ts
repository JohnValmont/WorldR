import { Router } from 'express';
import authRoutes from './auth.routes';
import nationRoutes from './nation.routes';
import lawRoutes from './law.routes';
import parameterRoutes from './parameter.routes';
import multiplayerRoutes from './multiplayer.routes';
import worldRoutes from './world.routes';
import partyRoutes from './party.routes';
import partyStaffRoutes from './party-staff.routes';
import profileRoutes from './profile.routes';
import notificationRoutes from './notification.routes';
import electionRoutes from './election.routes';
import reportRoutes from './report.routes';
import voterBlocRoutes from './voter-bloc.routes';


const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/nations', nationRoutes);
apiRouter.use('/nations', multiplayerRoutes);
apiRouter.use('/nations/:nationId/laws', lawRoutes);
apiRouter.use('/nations/:nationId/parties', partyRoutes);
apiRouter.use('/nations/:nationId/parties/:partyId/staff', partyStaffRoutes);
apiRouter.use('/nations/:nationId/elections', electionRoutes);
apiRouter.use('/nations/:nationId/reports', reportRoutes);
apiRouter.use('/nations/:nationId/voter-blocs', voterBlocRoutes);

apiRouter.use('/parameters', parameterRoutes);
apiRouter.use('/world', worldRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/notifications', notificationRoutes);

export default apiRouter;

import { Router } from 'express';
import { RegistryController } from '../controllers/registry.controller';

const router = Router();

// Registry is public, no auth required
router.get('/companies', RegistryController.getCompanies);
router.get('/companies/:id', RegistryController.getCompany);

export default router;

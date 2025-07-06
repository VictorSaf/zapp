import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error-handler';
import { authenticate } from '@/middleware/auth';
import validateRequest, { serviceSchemas } from '@/middleware/validation';
import { serviceDiscovery } from '@/services/service-discovery';

const router = Router();

/**
 * GET /services/discover/:serviceName
 * Discover services by name
 */
router.get('/discover/:serviceName',
  authenticate,
  validateRequest({ 
    params: serviceSchemas.discoverServices,
    query: serviceSchemas.discoverServices
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;
    const { passing, tags } = req.query as any;
    
    const services = await serviceDiscovery.discoverServices(serviceName, {
      passing,
      tags,
    });
    
    res.json({
      success: true,
      data: {
        services,
        totalCount: services.length,
        serviceName,
      },
    });
  })
);

/**
 * GET /services/instance/:serviceName
 * Get a service instance (with load balancing)
 */
router.get('/instance/:serviceName',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;
    const strategy = req.query.strategy as any || 'round_robin';
    
    const instance = await serviceDiscovery.getServiceInstance(serviceName, strategy);
    
    if (!instance) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: `No healthy instances found for service: ${serviceName}`,
        },
      });
    }
    
    res.json({
      success: true,
      data: {
        instance,
        serviceName,
        strategy,
      },
    });
  })
);

/**
 * POST /services/register
 * Register a service
 */
router.post('/register',
  authenticate,
  validateRequest({ body: serviceSchemas.registerService }),
  asyncHandler(async (req: Request, res: Response) => {
    await serviceDiscovery.registerService(req.body);
    
    res.json({
      success: true,
      message: 'Service registered successfully',
      data: {
        serviceName: req.body.serviceName,
        serviceId: req.body.serviceId,
      },
    });
  })
);

/**
 * DELETE /services/:serviceId
 * Deregister a service
 */
router.delete('/:serviceId',
  authenticate,
  validateRequest({ params: serviceSchemas.deregisterService }),
  asyncHandler(async (req: Request, res: Response) => {
    await serviceDiscovery.deregisterService(req.params.serviceId);
    
    res.json({
      success: true,
      message: 'Service deregistered successfully',
      data: {
        serviceId: req.params.serviceId,
      },
    });
  })
);

/**
 * GET /services/kv/:key
 * Get key-value pair from Consul
 */
router.get('/kv/:key',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const value = await serviceDiscovery.getKeyValue(req.params.key);
    
    res.json({
      success: true,
      data: {
        key: req.params.key,
        value,
        found: value !== null,
      },
    });
  })
);

/**
 * PUT /services/kv/:key
 * Set key-value pair in Consul
 */
router.put('/kv/:key',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    await serviceDiscovery.setKeyValue(req.params.key, req.body.value);
    
    res.json({
      success: true,
      message: 'Key-value pair set successfully',
      data: {
        key: req.params.key,
        value: req.body.value,
      },
    });
  })
);

export default router;
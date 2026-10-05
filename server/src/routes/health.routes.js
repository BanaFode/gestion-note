import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
   res.status(200).json({
      success: true,
      message: 'API opérationnelle',
      data: {
         status: 'UP',
         timestamp: new Date().toISOString(),
      },
   });
});

export default router;

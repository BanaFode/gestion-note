import { validationResult } from 'express-validator';

const validate = (req, res, next) => {
   const result = validationResult(req);

   if (!result.isEmpty()) {
      return res.status(400).json({
         success: false,
         message: 'Les données envoyées sont invalides.',
         errors: result.array().map(({ msg }) => msg),
      });
   }

   return next();
};

export default validate;

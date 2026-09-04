import { Router } from 'express';
import { MessagesController } from './messages.controller.js';
import { validate } from '../../middlewares/validator.js';
import { createMessageSchema, getMessageSchema, listMessagesSchema } from './messages.schema.js';

export function createMessagesRoutes(controller: MessagesController): Router {
  const router = Router();

  router.post('/', validate(createMessageSchema), controller.sendMessage);
  router.get('/', validate(listMessagesSchema), controller.listMessages);
  router.get('/:id', validate(getMessageSchema), controller.getMessage);

  return router;
}

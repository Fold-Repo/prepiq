import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from '@exam-ai/validation';
import { formatSuccessResponse, formatErrorResponse } from '@exam-ai/shared';

const authService = new AuthService();

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parseResult.error.errors[0].message, request.id)
      );
    }

    const user = await authService.register(parseResult.data);
    const token = request.server.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return reply.status(201).send(
      formatSuccessResponse({
        user,
        token,
      })
    );
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        formatErrorResponse('VALIDATION_ERROR', parseResult.error.errors[0].message, request.id)
      );
    }

    const user = await authService.login(parseResult.data);
    const token = request.server.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return reply.status(200).send(
      formatSuccessResponse({
        user,
        token,
      })
    );
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user;
    const profile = await authService.getUserProfile(userPayload.id);

    return reply.status(200).send(
      formatSuccessResponse({
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          preferredAI: (profile as any).preferredAI || 'OPENAI',
          createdAt: profile.createdAt,
        },
      })
    );
  }

  async updateSettings(request: FastifyRequest, reply: FastifyReply) {
    const userPayload = request.user;
    const body = request.body as any;

    if (body.preferredAI && !['OPENAI', 'ANTHROPIC'].includes(body.preferredAI)) {
      return reply.status(400).send(formatErrorResponse('VALIDATION_ERROR', 'Invalid preferredAI', request.id));
    }

    const updated = await authService.updateSettings(userPayload.id, {
      preferredAI: body.preferredAI,
    });

    return reply.status(200).send(
      formatSuccessResponse({
        settings: updated,
      })
    );
  }

  async logout(_request: FastifyRequest, reply: FastifyReply) {
    return reply.status(200).send(
      formatSuccessResponse({ message: 'Successfully logged out' })
    );
  }
}

import { FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsService } from './analytics.service';
import { formatSuccessResponse } from '@exam-ai/shared';

export class AnalyticsController {
  private analyticsService = new AnalyticsService();

  getCourseAnalytics = async (
    request: FastifyRequest<{ Params: { courseId: string } }>,
    reply: FastifyReply
  ) => {
    const userId = request.user.id;
    const { courseId } = request.params;

    const data = await this.analyticsService.getCourseAnalytics(courseId, userId);
    return reply.status(200).send(formatSuccessResponse(data));
  };
}

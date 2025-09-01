from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
import logging
import json

from .models import AIProcessingSettings, EmailProcessingLog, AIPromptTemplate
from User.models import EmailMessage
from .tasks import process_new_email_with_ai, generate_ai_reply_for_email, bulk_process_emails_with_ai
from .ai_service import AIEmailProcessor

# Set up logging
logger = logging.getLogger(__name__)

class AISettingsView(APIView):
    """Get and update AI processing settings for the authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current AI settings for the user"""
        try:
            ai_settings, created = AIProcessingSettings.objects.get_or_create(
                user=request.user,
                defaults={
                    'is_enabled': True,
                    'auto_reply_enabled': True,
                    'default_prompt': "You are a professional email assistant. Analyze the email and draft a helpful, polite, and appropriate response. Be concise but complete in your response."
                }
            )
            
            return Response({
                'id': ai_settings.id,
                'is_enabled': ai_settings.is_enabled,
                'auto_reply_enabled': ai_settings.auto_reply_enabled,
                'default_prompt': ai_settings.default_prompt,
                'max_response_length': ai_settings.max_response_length,
                'response_tone': ai_settings.response_tone,
                'created_at': ai_settings.created_at.isoformat(),
                'updated_at': ai_settings.updated_at.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error getting AI settings: {str(e)}")
            return Response({
                'message': f'Failed to get AI settings: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def post(self, request):
        """Update AI settings for the user"""
        try:
            ai_settings, created = AIProcessingSettings.objects.get_or_create(
                user=request.user
            )
            
            # Update fields if provided
            if 'is_enabled' in request.data:
                ai_settings.is_enabled = request.data['is_enabled']
            
            if 'auto_reply_enabled' in request.data:
                ai_settings.auto_reply_enabled = request.data['auto_reply_enabled']
            
            if 'default_prompt' in request.data:
                ai_settings.default_prompt = request.data['default_prompt']
            
            if 'max_response_length' in request.data:
                ai_settings.max_response_length = request.data['max_response_length']
            
            if 'response_tone' in request.data:
                ai_settings.response_tone = request.data['response_tone']
            
            ai_settings.save()
            
            logger.info(f"Updated AI settings for user {request.user.get_full_name()}")
            
            return Response({
                'message': 'AI settings updated successfully',
                'settings': {
                    'id': ai_settings.id,
                    'is_enabled': ai_settings.is_enabled,
                    'auto_reply_enabled': ai_settings.auto_reply_enabled,
                    'default_prompt': ai_settings.default_prompt,
                    'max_response_length': ai_settings.max_response_length,
                    'response_tone': ai_settings.response_tone
                }
            })
            
        except Exception as e:
            logger.error(f"Error updating AI settings: {str(e)}")
            return Response({
                'message': f'Failed to update AI settings: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class ProcessEmailWithAIView(APIView):
    """Manually trigger AI processing for a specific email"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, email_id):
        try:
            # Get the email
            try:
                email_message = EmailMessage.objects.select_related('email_account').get(
                    id=email_id,
                    email_account__user=request.user
                )
            except EmailMessage.DoesNotExist:
                return Response({
                    'message': 'Email not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get processing type from request
            processing_type = request.data.get('processing_type', 'analysis')
            
            if processing_type not in ['analysis', 'reply_generation', 'auto_reply']:
                return Response({
                    'message': 'Invalid processing type. Use "analysis", "reply_generation", or "auto_reply"'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Trigger AI processing task
            if processing_type == 'reply_generation':
                task = generate_ai_reply_for_email.delay(str(email_message.id))
            else:
                task = process_new_email_with_ai.delay(str(email_message.id))
            
            logger.info(f"🤖 Queued AI processing task {task.id} for email {email_message.subject}")
            
            return Response({
                'message': f'AI processing queued successfully for email: {email_message.subject}',
                'email_id': email_id,
                'task_id': task.id,
                'processing_type': processing_type
            })
            
        except Exception as e:
            logger.error(f"Error triggering AI processing: {str(e)}")
            return Response({
                'message': f'Failed to trigger AI processing: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GetProcessingLogsView(APIView):
    """Get AI processing logs for the user's emails"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get query parameters
            limit = int(request.GET.get('limit', 50))
            offset = int(request.GET.get('offset', 0))
            email_id = request.GET.get('email_id')
            processing_type = request.GET.get('processing_type')
            
            # Build query
            logs_query = EmailProcessingLog.objects.filter(
                email_message__email_account__user=request.user
            ).select_related('email_message', 'email_message__email_account')
            
            # Apply filters
            if email_id:
                logs_query = logs_query.filter(email_message_id=email_id)
            
            if processing_type:
                logs_query = logs_query.filter(processing_type=processing_type)
            
            # Get total count
            total_count = logs_query.count()
            
            # Apply pagination
            logs = logs_query.order_by('-created_at')[offset:offset + limit]
            
            # Format response
            logs_data = []
            for log in logs:
                logs_data.append({
                    'id': log.id,
                    'email_subject': log.email_message.subject,
                    'email_sender': log.email_message.sender,
                    'processing_type': log.processing_type,
                    'status': log.status,
                    'ai_summary': log.ai_summary,
                    'ai_sentiment': log.ai_sentiment,
                    'ai_category': log.ai_category,
                    'ai_priority': log.ai_priority,
                    'generated_reply_subject': log.generated_reply_subject,
                    'reply_sent': log.reply_sent,
                    'reply_sent_at': log.reply_sent_at.isoformat() if log.reply_sent_at else None,
                    'processing_duration': log.processing_duration,
                    'tokens_used': log.tokens_used,
                    'error_message': log.error_message,
                    'created_at': log.created_at.isoformat()
                })
            
            return Response({
                'logs': logs_data,
                'total_count': total_count,
                'limit': limit,
                'offset': offset
            })
            
        except Exception as e:
            logger.error(f"Error getting processing logs: {str(e)}")
            return Response({
                'message': f'Failed to get processing logs: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class GenerateReplyView(APIView):
    """Generate an AI reply for an email without sending it"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, email_id):
        try:
            # Get the email
            try:
                email_message = EmailMessage.objects.select_related('email_account').get(
                    id=email_id,
                    email_account__user=request.user
                )
            except EmailMessage.DoesNotExist:
                return Response({
                    'message': 'Email not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if AI processing is enabled
            ai_processor = AIEmailProcessor(user=request.user)
            if not ai_processor.is_processing_enabled():
                return Response({
                    'message': 'AI processing is disabled for your account'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate reply using AI processor
            result = ai_processor.process_email_with_ai(email_message, 'reply_generation')
            
            if result.get('status') == 'success':
                return Response({
                    'message': 'AI reply generated successfully',
                    'email_id': email_id,
                    'analysis': result.get('analysis', {}),
                    'generated_reply': result.get('generated_reply', {})
                })
            else:
                return Response({
                    'message': f'Failed to generate AI reply: {result.get("error", "Unknown error")}',
                    'error': result.get('error')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        except Exception as e:
            logger.error(f"Error in generate reply view: {str(e)}")
            return Response({
                'message': f'Failed to generate AI reply: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class BulkProcessEmailsView(APIView):
    """Bulk process multiple emails with AI"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get parameters
            processing_type = request.data.get('processing_type', 'analysis')
            email_account_ids = request.data.get('email_account_ids')  # Optional list
            
            if processing_type not in ['analysis', 'reply_generation', 'auto_reply']:
                return Response({
                    'message': 'Invalid processing type. Use "analysis", "reply_generation", or "auto_reply"'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if AI processing is enabled
            ai_processor = AIEmailProcessor(user=request.user)
            if not ai_processor.is_processing_enabled():
                return Response({
                    'message': 'AI processing is disabled for your account'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Trigger bulk processing task
            task = bulk_process_emails_with_ai.delay(
                str(request.user.id),
                email_account_ids,
                processing_type
            )
            
            logger.info(f"🔄 Queued bulk AI processing task {task.id} for user {request.user.get_full_name()}")
            
            return Response({
                'message': f'Bulk AI processing queued successfully',
                'task_id': task.id,
                'processing_type': processing_type,
                'email_account_ids': email_account_ids
            })
            
        except Exception as e:
            logger.error(f"Error in bulk process view: {str(e)}")
            return Response({
                'message': f'Failed to start bulk processing: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class EmailAnalysisView(APIView):
    """Get AI analysis for a specific email"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, email_id):
        try:
            # Get the email
            try:
                email_message = EmailMessage.objects.select_related('email_account').get(
                    id=email_id,
                    email_account__user=request.user
                )
            except EmailMessage.DoesNotExist:
                return Response({
                    'message': 'Email not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Get the latest processing log for this email
            processing_log = EmailProcessingLog.objects.filter(
                email_message=email_message
            ).order_by('-created_at').first()
            
            if not processing_log:
                return Response({
                    'message': 'No AI analysis found for this email',
                    'email_id': email_id,
                    'has_analysis': False
                })
            
            return Response({
                'email_id': email_id,
                'has_analysis': True,
                'analysis': {
                    'processing_type': processing_log.processing_type,
                    'status': processing_log.status,
                    'ai_summary': processing_log.ai_summary,
                    'ai_sentiment': processing_log.ai_sentiment,
                    'ai_category': processing_log.ai_category,
                    'ai_priority': processing_log.ai_priority,
                    'ai_analysis': processing_log.ai_analysis,
                    'generated_reply_subject': processing_log.generated_reply_subject,
                    'generated_reply_body': processing_log.generated_reply_body,
                    'reply_sent': processing_log.reply_sent,
                    'reply_sent_at': processing_log.reply_sent_at.isoformat() if processing_log.reply_sent_at else None,
                    'processing_duration': processing_log.processing_duration,
                    'tokens_used': processing_log.tokens_used,
                    'error_message': processing_log.error_message,
                    'created_at': processing_log.created_at.isoformat()
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting email analysis: {str(e)}")
            return Response({
                'message': f'Failed to get email analysis: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)


class AIProcessingStatsView(APIView):
    """Get AI processing statistics for the user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from datetime import timedelta
            from django.db.models import Count, Avg
            
            # Get time range (default to last 30 days)
            days = int(request.GET.get('days', 30))
            since_date = timezone.now() - timedelta(days=days)
            
            # Get processing logs for user's emails
            logs_query = EmailProcessingLog.objects.filter(
                email_message__email_account__user=request.user,
                created_at__gte=since_date
            )
            
            # Calculate statistics
            total_processed = logs_query.count()
            
            status_stats = logs_query.values('status').annotate(
                count=Count('status')
            )
            
            processing_type_stats = logs_query.values('processing_type').annotate(
                count=Count('processing_type')
            )
            
            sentiment_stats = logs_query.exclude(
                ai_sentiment__isnull=True
            ).exclude(
                ai_sentiment=''
            ).values('ai_sentiment').annotate(
                count=Count('ai_sentiment')
            )
            
            replies_sent = logs_query.filter(reply_sent=True).count()
            
            avg_processing_time = logs_query.filter(
                processing_duration__isnull=False
            ).aggregate(avg_time=Avg('processing_duration'))['avg_time']
            
            total_tokens = logs_query.filter(
                tokens_used__isnull=False
            ).aggregate(total=Count('tokens_used'))['total'] or 0
            
            return Response({
                'period_days': days,
                'total_processed': total_processed,
                'replies_sent': replies_sent,
                'average_processing_time': round(avg_processing_time, 2) if avg_processing_time else 0,
                'total_tokens_used': total_tokens,
                'status_breakdown': list(status_stats),
                'processing_type_breakdown': list(processing_type_stats),
                'sentiment_breakdown': list(sentiment_stats)
            })
            
        except Exception as e:
            logger.error(f"Error getting processing stats: {str(e)}")
            return Response({
                'message': f'Failed to get processing stats: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)

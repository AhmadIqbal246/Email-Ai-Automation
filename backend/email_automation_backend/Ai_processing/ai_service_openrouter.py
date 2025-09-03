import os
import json
import time
import logging
from typing import Dict, Optional, Tuple, Any
from openai import OpenAI
from django.conf import settings
from .models import AIProcessingSettings, AIPromptTemplate

# Set up logging
logger = logging.getLogger(__name__)

class AIEmailProcessor:
    """
    AI service for processing emails using OpenRouter (which provides access to OpenAI and other models).
    Handles email analysis, reply generation, and automated responses.
    """
    
    def __init__(self, user=None):
        self.user = user
        
        # Initialize OpenRouter client (uses OpenAI library with custom base URL)
        api_key = os.getenv('OPENAI_API_KEY')  # OpenRouter uses same env var name for compatibility
        if not api_key:
            logger.error("OpenRouter API key not found in environment variables")
            self.client = None
        else:
            try:
                # OpenRouter configuration
                self.client = OpenAI(
                    api_key=api_key,
                    base_url="https://openrouter.ai/api/v1",
                )
                logger.info("OpenRouter client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize OpenRouter client: {str(e)}")
                self.client = None
            
        # Use OpenAI models through OpenRouter (more cost-effective)
        self.model = os.getenv('OPENAI_MODEL', 'openai/gpt-4o-mini')  # OpenRouter format
        
        # Get or create AI settings for the user
        if user:
            self.ai_settings, created = AIProcessingSettings.objects.get_or_create(
                user=user,
                defaults={
                    'is_enabled': True,
                    'auto_reply_enabled': True,
                    'default_prompt': self._get_default_prompt()
                }
            )
            if created:
                logger.info(f"Created new AI settings for user {user.get_full_name()}")
        else:
            self.ai_settings = None
    
    def _get_default_prompt(self) -> str:
        """Get default AI prompt for email processing"""
        return """You are a professional email assistant. Your task is to analyze the incoming email and generate an appropriate response.

Please follow these guidelines:
1. Analyze the email content, tone, and intent
2. Determine the appropriate response tone (professional, friendly, formal)
3. Generate a helpful, accurate, and contextually appropriate reply
4. Keep responses concise but complete
5. Be polite and professional in all communications
6. If the email requires specific information you don't have, politely indicate that you'll need to gather more details

Always respond in a helpful and professional manner."""
    
    def analyze_email_content(self, email_subject: str, email_body: str, sender: str) -> Dict[str, Any]:
        """
        Analyze email content using AI to extract insights and metadata.
        
        Args:
            email_subject: Email subject line
            email_body: Email body content
            sender: Sender email address
            
        Returns:
            Dict containing analysis results
        """
        logger.info(f"Starting AI analysis for email from {sender}")
        
        if not self.client:
            logger.error("OpenRouter client not initialized")
            return self._get_fallback_analysis(email_subject, email_body, sender, "Client not initialized")
        
        try:
            start_time = time.time()
            
            # Prepare analysis prompt
            analysis_prompt = f"""
            Please analyze this email and provide a structured response in JSON format:

            Email Subject: {email_subject}
            From: {sender}
            Email Body: {email_body}

            Provide analysis in this exact JSON format:
            {{
                "summary": "Brief summary of the email content",
                "sentiment": "positive/neutral/negative/urgent",
                "category": "Category of the email (e.g., inquiry, complaint, request, information)",
                "priority": "low/medium/high/urgent",
                "key_points": ["key point 1", "key point 2"],
                "requires_response": true/false,
                "suggested_actions": ["action 1", "action 2"],
                "tone": "professional/friendly/formal/casual"
            }}
            """
            
            # Make API call through OpenRouter
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert email analysis assistant. Always respond with valid JSON."},
                    {"role": "user", "content": analysis_prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )
            
            # Process response
            ai_response = response.choices[0].message.content.strip()
            logger.info(f"Raw AI analysis response: {ai_response}")
            
            # Try to parse JSON response
            try:
                analysis_result = json.loads(ai_response)
            except json.JSONDecodeError:
                # If JSON parsing fails, extract content between {}
                import re
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    try:
                        analysis_result = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse AI response as JSON: {ai_response}")
                        analysis_result = self._get_fallback_analysis_data()
                else:
                    logger.error(f"No JSON found in AI response: {ai_response}")
                    analysis_result = self._get_fallback_analysis_data()
            
            # Calculate processing time and tokens
            processing_time = time.time() - start_time
            tokens_used = response.usage.total_tokens if hasattr(response, 'usage') else 0
            
            analysis_result.update({
                "processing_duration": processing_time,
                "tokens_used": tokens_used,
                "ai_model": self.model
            })
            
            logger.info(f"Email analysis completed in {processing_time:.2f}s using {tokens_used} tokens")
            logger.info(f"Analysis result: {analysis_result}")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing email: {str(e)}")
            return self._get_fallback_analysis(email_subject, email_body, sender, str(e))
    
    def _get_fallback_analysis_data(self):
        """Get fallback analysis data structure"""
        return {
            "summary": "Failed to parse AI analysis",
            "sentiment": "neutral",
            "category": "general",
            "priority": "medium",
            "key_points": ["Analysis failed"],
            "requires_response": True,
            "suggested_actions": ["Manual review required"],
            "tone": "professional"
        }
    
    def _get_fallback_analysis(self, email_subject: str, email_body: str, sender: str, error: str):
        """Get fallback analysis with error details"""
        return {
            "summary": f"Analysis failed: {error}",
            "sentiment": "neutral",
            "category": "error",
            "priority": "medium",
            "key_points": ["Analysis error occurred"],
            "requires_response": False,
            "suggested_actions": ["Manual review required"],
            "tone": "professional",
            "error": error
        }
    
    def generate_reply(self, email_subject: str, email_body: str, sender: str, 
                      analysis_result: Optional[Dict] = None) -> Tuple[str, str]:
        """
        Generate an AI reply to an email.
        
        Args:
            email_subject: Original email subject
            email_body: Original email body
            sender: Original sender email
            analysis_result: Optional previous analysis result
            
        Returns:
            Tuple of (reply_subject, reply_body)
        """
        logger.info(f"Generating AI reply for email from {sender}")
        
        if not self.client:
            logger.error("OpenRouter client not initialized")
            reply_subject = f"Re: {email_subject}" if not email_subject.startswith('Re:') else email_subject
            reply_body = "Thank you for your email. I've received your message and will respond soon.\n\nBest regards"
            return reply_subject, reply_body
        
        try:
            start_time = time.time()
            
            # Get appropriate prompt
            prompt = self._get_reply_prompt(email_subject, email_body, sender, analysis_result)
            
            # Prepare reply generation request
            reply_prompt = f"""
            Based on this email, generate an appropriate reply:

            Original Email:
            Subject: {email_subject}
            From: {sender}
            Body: {email_body}
            
            {prompt}

            Please provide your response in this exact JSON format:
            {{
                "reply_subject": "Appropriate reply subject (start with 'Re: ' if not already present)",
                "reply_body": "Complete reply body in professional format"
            }}
            """
            
            # Make API call through OpenRouter
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a professional email assistant. Generate helpful, accurate, and appropriate email replies. Always respond with valid JSON."},
                    {"role": "user", "content": reply_prompt}
                ],
                max_tokens=1500,
                temperature=0.7
            )
            
            # Process response
            ai_response = response.choices[0].message.content.strip()
            logger.info(f"Raw AI reply response: {ai_response}")
            
            # Parse JSON response
            try:
                reply_result = json.loads(ai_response)
                reply_subject = reply_result.get("reply_subject", f"Re: {email_subject}")
                reply_body = reply_result.get("reply_body", "Thank you for your email. I'll get back to you soon.")
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract content
                import re
                json_match = re.search(r'\{.*\}', ai_response, re.DOTALL)
                if json_match:
                    try:
                        reply_result = json.loads(json_match.group())
                        reply_subject = reply_result.get("reply_subject", f"Re: {email_subject}")
                        reply_body = reply_result.get("reply_body", "Thank you for your email. I'll get back to you soon.")
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse AI reply as JSON: {ai_response}")
                        reply_subject = f"Re: {email_subject}" if not email_subject.startswith('Re:') else email_subject
                        reply_body = "Thank you for your email. I've received your message and will respond appropriately."
                else:
                    # Use the raw response as body if no JSON structure
                    reply_subject = f"Re: {email_subject}" if not email_subject.startswith('Re:') else email_subject
                    reply_body = ai_response.strip()
            
            processing_time = time.time() - start_time
            logger.info(f"Reply generated in {processing_time:.2f}s")
            logger.info(f"Generated subject: {reply_subject}")
            logger.info(f"Generated body preview: {reply_body[:200]}...")
            
            return reply_subject, reply_body
            
        except Exception as e:
            logger.error(f"Error generating reply: {str(e)}")
            # Return a safe fallback reply
            reply_subject = f"Re: {email_subject}" if not email_subject.startswith('Re:') else email_subject
            reply_body = f"Thank you for your email. I've received your message and will respond soon.\n\nBest regards"
            return reply_subject, reply_body
    
    def _get_reply_prompt(self, email_subject: str, email_body: str, sender: str, 
                         analysis_result: Optional[Dict] = None) -> str:
        """Get the appropriate prompt for reply generation"""
        
        # Try to find a specific prompt template for this email
        if self.user:
            prompt_template = self._find_matching_template(email_subject, email_body, sender)
            if prompt_template:
                logger.info(f"Using custom prompt template: {prompt_template.name}")
                return prompt_template.prompt_text
        
        # Use default prompt from settings or fallback
        if self.ai_settings and self.ai_settings.default_prompt:
            prompt = self.ai_settings.default_prompt
        else:
            prompt = self._get_default_prompt()
        
        # Add analysis context if available
        if analysis_result:
            sentiment = analysis_result.get('sentiment', 'neutral')
            category = analysis_result.get('category', 'general')
            priority = analysis_result.get('priority', 'medium')
            
            prompt += f"\n\nEmail Analysis Context:\n- Sentiment: {sentiment}\n- Category: {category}\n- Priority: {priority}"
        
        return prompt
    
    def _find_matching_template(self, email_subject: str, email_body: str, sender: str) -> Optional[AIPromptTemplate]:
        """Find a matching AI prompt template for the email"""
        if not self.user:
            return None
            
        # Get active templates ordered by priority
        templates = AIPromptTemplate.objects.filter(
            user=self.user,
            is_active=True
        ).order_by('-priority', 'name')
        
        email_content_lower = f"{email_subject} {email_body}".lower()
        sender_lower = sender.lower()
        
        for template in templates:
            # Check keyword matches
            keywords = template.get_keywords_list()
            if keywords:
                for keyword in keywords:
                    if keyword in email_content_lower:
                        logger.info(f"Template '{template.name}' matched on keyword: {keyword}")
                        return template
            
            # Check sender pattern matches
            sender_patterns = template.get_sender_patterns_list()
            if sender_patterns:
                for pattern in sender_patterns:
                    if pattern in sender_lower:
                        logger.info(f"Template '{template.name}' matched on sender pattern: {pattern}")
                        return template
        
        # Return default template if exists
        default_template = templates.filter(is_default=True).first()
        if default_template:
            logger.info(f"Using default template: {default_template.name}")
            return default_template
        
        return None
    
    def process_email_with_ai(self, email_message, processing_type='analysis'):
        """
        Main method to process an email with AI (analysis and/or reply generation).
        
        Args:
            email_message: EmailMessage instance
            processing_type: 'analysis', 'reply_generation', or 'auto_reply'
            
        Returns:
            Dict with processing results
        """
        from .models import EmailProcessingLog
        
        logger.info(f"Starting AI processing for email: {email_message.subject}")
        logger.info(f"Email from: {email_message.sender}")
        logger.info(f"Processing type: {processing_type}")
        logger.info(f"Using model: {self.model} via OpenRouter")
        
        # Create processing log
        log_entry = EmailProcessingLog.objects.create(
            email_message=email_message,
            processing_type=processing_type,
            status='processing'
        )
        
        try:
            result = {
                'status': 'success',
                'email_id': str(email_message.id),
                'processing_type': processing_type
            }
            
            # Step 1: Analyze email content
            logger.info("Step 1: Analyzing email content...")
            analysis_result = self.analyze_email_content(
                email_message.subject,
                email_message.body_plain or email_message.body_html,
                email_message.sender
            )
            
            result['analysis'] = analysis_result
            
            # Update log with analysis
            log_entry.ai_analysis = analysis_result
            log_entry.ai_summary = analysis_result.get('summary', '')
            log_entry.ai_sentiment = analysis_result.get('sentiment', '')
            log_entry.ai_category = analysis_result.get('category', '')
            log_entry.ai_priority = analysis_result.get('priority', '')
            
            # Step 2: Generate reply if requested
            if processing_type in ['reply_generation', 'auto_reply']:
                logger.info("Step 2: Generating reply...")
                reply_subject, reply_body = self.generate_reply(
                    email_message.subject,
                    email_message.body_plain or email_message.body_html,
                    email_message.sender,
                    analysis_result
                )
                
                result['generated_reply'] = {
                    'subject': reply_subject,
                    'body': reply_body
                }
                
                # Update log with reply
                log_entry.generated_reply_subject = reply_subject
                log_entry.generated_reply_body = reply_body
            
            # Update processing log as completed
            log_entry.status = 'completed'
            log_entry.processing_duration = analysis_result.get('processing_duration', 0)
            log_entry.tokens_used = analysis_result.get('tokens_used', 0)
            log_entry.save()
            
            logger.info(f"AI processing completed successfully for email: {email_message.subject}")
            return result
            
        except Exception as e:
            logger.error(f"Error in AI processing: {str(e)}")
            
            # Update processing log as failed
            log_entry.status = 'failed'
            log_entry.error_message = str(e)
            log_entry.save()
            
            return {
                'status': 'error',
                'error': str(e),
                'email_id': str(email_message.id),
                'processing_type': processing_type
            }

    def is_processing_enabled(self) -> bool:
        """Check if AI processing is enabled for the user"""
        if not self.ai_settings:
            return False
        return self.ai_settings.is_enabled

    def is_auto_reply_enabled(self) -> bool:
        """Check if auto reply is enabled for the user"""
        if not self.ai_settings:
            return False
        return self.ai_settings.is_enabled and self.ai_settings.auto_reply_enabled

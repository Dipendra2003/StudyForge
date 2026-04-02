import { Router, Request, Response } from 'express';
import { db } from '../db';
import { contactMessages } from '@shared/schema';
import { z } from 'zod';
import { EmailService } from '../services/email.service';

const router = Router();
const emailService = new EmailService();

// Validation schema for contact form
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
});

// Submit contact form
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = contactSchema.parse(req.body);

    // Get user ID if authenticated
    const userId = req.user?.id || null;

    // Insert contact message into database
    const result = await db.insert(contactMessages).values({
      userId,
      name: validatedData.name,
      email: validatedData.email,
      subject: validatedData.subject,
      message: validatedData.message,
      status: 'pending',
    });

    const insertId = (result as any).insertId;

    // Send email notification to admin (non-blocking)
    emailService.sendContactNotification(
      validatedData.name,
      validatedData.email,
      validatedData.subject,
      validatedData.message,
      userId || undefined
    ).catch(error => {
      console.error('Failed to send contact notification email:', error);
      // Don't fail the request if email fails
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
      data: {
        id: insertId,
        createdAt: new Date(),
      },
    });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
    });
  }
});

export default router;

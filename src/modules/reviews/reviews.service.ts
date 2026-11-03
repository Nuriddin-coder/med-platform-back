import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReviewResponseDto } from '../doctors/dto/doctor.dto.js';
import { CreateReviewDto } from './dto/review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!patient) {
      throw new ForbiddenAppException('Faqat bemorlar fikr qoldirishi mumkin');
    }

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
    });
    if (!appointment) {
      throw new NotFoundAppException('Qabul topilmadi');
    }

    if (appointment.patientId !== patient.id) {
      throw new ForbiddenAppException('Siz faqat o‘zingizning qabulingiz uchun fikr bildira olasiz');
    }

    if (appointment.doctorId !== dto.doctorId) {
      throw new ConflictAppException('Qabul ko‘rsatilgan shifokorga tegishli emas');
    }

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new ConflictAppException(
        'Faqat yakunlangan (COMPLETED) qabullar uchun sharh qoldirish mumkin',
      );
    }

    const existingReview = await this.prisma.review.findFirst({
      where: { appointmentId: dto.appointmentId },
    });
    if (existingReview) {
      throw new ConflictAppException('Ushbu qabul uchun allaqachon sharh qoldirilgan');
    }

    const review = await this.prisma.review.create({
      data: {
        doctorId: dto.doctorId,
        patientId: patient.id,
        appointmentId: dto.appointmentId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
      include: {
        patient: {
          include: { user: true },
        },
      },
    });

    // Recalculate doctor rating & reviews count
    const doctorAggregates = await this.prisma.review.aggregate({
      where: { doctorId: dto.doctorId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const newDoctorRating = Math.round((doctorAggregates._avg.rating ?? 0) * 10) / 10;
    await this.prisma.doctor.update({
      where: { id: dto.doctorId },
      data: {
        rating: newDoctorRating,
        reviewsCount: doctorAggregates._count.rating,
      },
    });

    // Recalculate clinic rating & reviews count
    if (appointment.clinicId) {
      const clinicAggregates = await this.prisma.review.aggregate({
        where: {
          appointment: { clinicId: appointment.clinicId },
        },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const newClinicRating = Math.round((clinicAggregates._avg.rating ?? 0) * 10) / 10;
      await this.prisma.clinic.update({
        where: { id: appointment.clinicId },
        data: {
          rating: newClinicRating,
          reviewsCount: clinicAggregates._count.rating,
        },
      });
    }

    return {
      id: review.id,
      doctorId: review.doctorId,
      patientId: review.patientId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      patient: {
        firstName: review.patient.user.firstName,
        lastName: review.patient.user.lastName,
      },
    };
  }
}


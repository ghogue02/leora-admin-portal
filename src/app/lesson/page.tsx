import type { Metadata } from 'next';
import { LessonContent } from './lesson-content';

export const metadata: Metadata = {
  title: 'Leora API Architecture Lesson',
  description:
    'Reference guide that maps internal routes, external services, and integration status for the Leora platform.',
};

export default function LessonPage() {
  return <LessonContent />;
}

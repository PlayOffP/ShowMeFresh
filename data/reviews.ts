import { shows } from './shows';

export interface Review {
  id: string;
  showId: string;
  authorName: string;
  rating: number;
  text: string;
  createdAt: string;
}

// Generate initial reviews
export const reviews: Review[] = [
  {
    id: '1',
    showId: '1',
    authorName: 'Emily Johnson',
    rating: 5,
    text: 'One of the best shows I\'ve ever watched! The 80s nostalgia and supernatural elements blend perfectly.',
    createdAt: '2023-10-15T14:30:00Z'
  },
  {
    id: '2',
    showId: '1',
    authorName: 'Michael Chen',
    rating: 4,
    text: 'Great storyline and character development. The third season wasn\'t as strong but still entertaining.',
    createdAt: '2023-09-22T09:15:00Z'
  },
  {
    id: '3',
    showId: '2',
    authorName: 'Sarah Williams',
    rating: 5,
    text: 'A masterpiece from start to finish. Bryan Cranston deserved every award for his performance.',
    createdAt: '2023-11-05T18:45:00Z'
  },
  {
    id: '4',
    showId: '3',
    authorName: 'David Lopez',
    rating: 5,
    text: 'Absolutely captivating! Anya Taylor-Joy is phenomenal, and the chess scenes are surprisingly thrilling.',
    createdAt: '2023-08-30T12:10:00Z'
  },
  {
    id: '5',
    showId: '4',
    authorName: 'Jessica Brown',
    rating: 4,
    text: 'This is the way! A fresh take on Star Wars with beautiful cinematography and an intriguing story.',
    createdAt: '2023-10-10T15:20:00Z'
  },
  {
    id: '6',
    showId: '5',
    authorName: 'Robert Kim',
    rating: 5,
    text: 'Mind-bending in the best way possible. You need to pay close attention, but it\'s worth it.',
    createdAt: '2023-09-05T10:30:00Z'
  }
];
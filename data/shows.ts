import { faker } from '@faker-js/faker';

export interface Show {
  id: string;
  title: string;
  trailerUrl: string;
  posterUrl: string;
  genres: string[];
  synopsis: string;
  year: number;
  rating: string;
  duration: string;
  viewCount?: number;
}

// Original shows array becomes trending
export const trendingShows: Show[] = [
  {
    id: '1',
    title: 'Stranger Things',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-mysterious-forest-girl-with-a-lantern-40723-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/10513822/pexels-photo-10513822.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Sci-Fi', 'Horror', 'Drama'],
    synopsis: 'When a young boy disappears, his mother, a police chief, and his friends must confront terrifying supernatural forces in order to get him back.',
    year: 2016,
    rating: 'TV-14',
    duration: '51m',
    viewCount: 1250000
  },
  {
    id: '2',
    title: 'Breaking Bad',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-desert-landscape-with-sunset-horizon-4006-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/4381392/pexels-photo-4381392.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Crime', 'Drama', 'Thriller'],
    synopsis: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family\'s future.',
    year: 2008,
    rating: 'TV-MA',
    duration: '49m',
    viewCount: 980000
  },
  {
    id: '3',
    title: 'The Queen\'s Gambit',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-modeling-in-a-fashion-session-34411-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/5935232/pexels-photo-5935232.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Drama'],
    synopsis: 'Orphaned at the tender age of nine, prodigious introvert Beth Harmon discovers and masters the game of chess in 1960s USA. But child stardom comes at a price.',
    year: 2020,
    rating: 'TV-MA',
    duration: '55m',
    viewCount: 850000
  },
  {
    id: '4',
    title: 'The Mandalorian',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-silhouette-of-a-man-of-a-desert-landscape-39099-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/5435440/pexels-photo-5435440.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    synopsis: 'The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.',
    year: 2019,
    rating: 'TV-14',
    duration: '40m',
    viewCount: 920000
  },
  {
    id: '5',
    title: 'Dark',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-mysterious-dark-forest-2739-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/9007127/pexels-photo-9007127.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Crime', 'Drama', 'Mystery'],
    synopsis: 'A family saga with a supernatural twist, set in a German town where the disappearance of two young children exposes the relationships among four families.',
    year: 2017,
    rating: 'TV-MA',
    duration: '60m',
    viewCount: 750000
  }
];

// New personalized recommendations
export const forYouShows: Show[] = [
  {
    id: '6',
    title: 'The Last Kingdom',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-medieval-warrior-running-through-the-forest-32746-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/6447217/pexels-photo-6447217.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Action', 'Drama', 'History'],
    synopsis: 'As Alfred the Great defends his kingdom from Norse invaders, Uhtred--born a Saxon but raised by Vikings--seeks to claim his ancestral birthright.',
    year: 2015,
    rating: 'TV-MA',
    duration: '60m'
  },
  {
    id: '7',
    title: 'The Crown',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-walking-through-a-castle-corridor-4202-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/5011647/pexels-photo-5011647.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Biography', 'Drama', 'History'],
    synopsis: 'Follows the political rivalries and romance of Queen Elizabeth II\'s reign and the events that shaped the second half of the twentieth century.',
    year: 2016,
    rating: 'TV-MA',
    duration: '58m'
  },
  {
    id: '8',
    title: 'Black Mirror',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-city-at-night-4161-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Sci-Fi', 'Thriller', 'Drama'],
    synopsis: 'An anthology series exploring a twisted, high-tech multiverse where humanity\'s greatest innovations and darkest instincts collide.',
    year: 2011,
    rating: 'TV-MA',
    duration: '60m'
  },
  {
    id: '9',
    title: 'The Witcher',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-medieval-warrior-fighting-with-sword-4557-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/5011647/pexels-photo-5011647.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Action', 'Adventure', 'Fantasy'],
    synopsis: 'Geralt of Rivia, a solitary monster hunter, struggles to find his place in a world where people often prove more wicked than beasts.',
    year: 2019,
    rating: 'TV-MA',
    duration: '60m'
  },
  {
    id: '10',
    title: 'Ozark',
    trailerUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-lake-surrounded-by-forest-4204-large.mp4',
    posterUrl: 'https://images.pexels.com/photos/5011647/pexels-photo-5011647.jpeg?auto=compress&cs=tinysrgb&w=800',
    genres: ['Crime', 'Drama', 'Thriller'],
    synopsis: 'A financial advisor drags his family from Chicago to the Missouri Ozarks, where he must launder money to appease a drug boss.',
    year: 2017,
    rating: 'TV-MA',
    duration: '60m'
  }
];

// Combined shows array for use throughout the app
export const shows: Show[] = [...trendingShows, ...forYouShows];

// Utility function to get a show by ID
export const getShowById = (id: string): Show | undefined => {
  return shows.find(show => show.id === id);
};
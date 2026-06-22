import { useParams } from 'react-router-dom';
import QuranProgress from './QuranProgress';
import NooraniQaida from './NooraniQaida';
import GenericSubjectDetail from './GenericSubjectDetail';

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  if (id === 'quran-with-tajweed') return <QuranProgress />;
  if (id === 'noorani-qaida-english' || id === 'noorani-qaida-urdu' || id === 'noorani-qaida') return <NooraniQaida />;
  return <GenericSubjectDetail />;
}

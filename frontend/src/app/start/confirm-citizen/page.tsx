import { redirect } from 'next/navigation';

export default function ConfirmCitizenRedirect() {
  redirect('/start/citizen-file');
}

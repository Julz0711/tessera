import { redirect } from 'next/navigation';

/** Rooms are created from the main menu now; old links land there. */
export default function CreatePage() {
  redirect('/');
}

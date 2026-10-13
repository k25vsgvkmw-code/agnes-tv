const card = (value) => Object.freeze(value);

export const APPROVED_AUTUMN_HOME = Object.freeze({
  activeMonth: 10,
  kicker: 'Α Ν Α Κ Α Λ Υ Ψ Ε   Τ Ο Ν   Κ Ο Σ Μ Ο',
  seasonTitle: 'Φθινόπωρο',
  seasonSubtitle: 'Ζήσε την ομορφιά της εποχής.',
  searchPlaceholder: 'Αναζήτηση προορισμού…',
  filters: Object.freeze(['Όλα', 'Καταρράκτες', 'Άλπεις', 'Τρόμσο', 'Road Trips']),
  cards: Object.freeze([
    card({ role: 'hero', journeyId: 'autumn-iceland-waterfalls', location: 'Ισλανδία', title: 'Καταρράκτες του Φθινοπώρου', subtitle: 'Εκεί όπου η φύση βάφεται με χρώματα και το νερό αφηγείται ιστορίες.', image: 'https://unsplash.com/photos/qRhpMOe0k7o/download?force=true&w=1800', objectPosition: '50% 50%', badge: 'Hero' }),
    card({ role: 'tall', journeyId: 'autumn-tromso', location: 'Νορβηγία', title: 'Τρόμσο', subtitle: 'Το Βόρειο Σέλας σε καλεί.', image: 'https://unsplash.com/photos/l9cneQNE03Y/download?force=true&w=1400', objectPosition: '50% 48%', badge: 'Aurora' }),
    card({ role: 'wide', journeyId: 'autumn-alps', location: 'Άλπεις', title: 'Άλπεις', subtitle: 'Γραφικά χωριά, λίμνες και χρυσά δάση.', image: 'https://unsplash.com/photos/7lsHx1CJjNI/download?force=true&w=1600', objectPosition: '50% 52%', badge: 'Motion' }),
    card({ role: 'narrow', journeyId: 'autumn-switzerland', location: 'Ελβετία', title: 'Ελβετία', subtitle: 'Στην καρδιά των Άλπεων.', image: 'https://unsplash.com/photos/x67DvRsKxSM/download?force=true&w=1200', objectPosition: '50% 48%', badge: 'Alpine' }),
    card({ role: 'narrow', journeyId: 'autumn-dolomites', location: 'Ιταλία', title: 'Δολομίτες', subtitle: 'Δρόμοι που μαγεύουν.', image: 'https://unsplash.com/photos/DKOnie6ESIE/download?force=true&w=1200', objectPosition: '50% 52%', badge: 'Road Trip' }),
    card({ role: 'bottom', journeyId: 'autumn-lake-como', location: 'Λίμνη Κόμο', title: 'Λίμνη Κόμο', subtitle: 'Κομψότητα σε κάθε εποχή.', image: 'https://unsplash.com/photos/kFlVXu3mRKI/download?force=true&w=1200', objectPosition: '50% 50%' }),
    card({ role: 'bottom', journeyId: 'autumn-plitvice', location: 'Πλίτβιτσε', title: 'Πλίτβιτσε', subtitle: 'Ένα παραμύθι στη φύση.', image: 'https://unsplash.com/photos/PhZ-27h-fNc/download?force=true&w=1200', objectPosition: '50% 52%' }),
    card({ role: 'bottom', journeyId: 'autumn-zermatt', location: 'Ζερμάτ', title: 'Ζερμάτ', subtitle: 'Αλπική μαγεία όλο τον χρόνο.', image: 'https://unsplash.com/photos/VXZy1mljRfk/download?force=true&w=1200', objectPosition: '50% 48%' }),
    card({ role: 'bottom', journeyId: 'autumn-amalfi', location: 'Αμάλφι', title: 'Αμάλφι', subtitle: 'Χρώματα που μένουν για πάντα.', image: 'https://unsplash.com/photos/jnwHRs7eVtw/download?force=true&w=1200', objectPosition: '50% 55%' }),
    card({ role: 'bottom', journeyId: 'autumn-lofoten', location: 'Λοφότεν', title: 'Λοφότεν', subtitle: 'Άγρια ομορφιά, αυθεντικές εμπειρίες.', image: 'https://unsplash.com/photos/2mlQp1qPcec/download?force=true&w=1200', objectPosition: '50% 50%' }),
  ].map(card)),
});

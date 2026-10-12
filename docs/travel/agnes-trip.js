function normalizeMessage(message) {
  return String(message ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´]/g, "'")
    .toLowerCase()
    .replace(/[^a-z0-9α-ωάέήίόύώϊϋΐΰ' ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function result(reply, statePatch, focusTarget) {
  return { reply, statePatch, focusTarget };
}

export function handleAgnesMessage(message, trip, state) {
  const text = normalizeMessage(message);
  const tripName = trip.hero.title;
  const currentDuration = state.duration;

  if (/4ημερο|4 ημερο|4 days|four days/.test(text)) {
    return result(
      `Το ${tripName} γίνεται 4ήμερο: κρατάω τα δυνατά σημεία και αφαιρώ τη flexible ημέρα χωρίς να κόψω αναχώρηση ή επιστροφή.`,
      { duration: 4 },
      'itinerary',
    );
  }

  if (/λιγοτερη οδηγηση|λιγοτερο οδηγ|less driving|drive less/.test(text)) {
    return result(
      'Χαλαρώνω τον ρυθμό οδήγησης και μειώνω τις προαιρετικές στάσεις, κρατώντας Βίκο, Μέτσοβο και Μετέωρα.',
      { drivingPace: 'relaxed' },
      'itinerary',
    );
  }

  if (/romantic|ρομαντικ/.test(text)) {
    return result(
      'Το κρατάω ως couple trip και δίνω μεγαλύτερο βάρος σε ήσυχα stays, golden-hour stops και χρόνο χωρίς βιασύνη.',
      { audience: 'couple' },
      'trip-style',
    );
  }

  if (/καλυτερα ξενοδοχεια|better hotels?|premium stays?|αναβαθμ.*διαμον/.test(text)) {
    return result(
      'Ανεβάζω τη διαμονή σε premium tier και θα προβάλλω πρώτα τις πιο ιδιαίτερες boutique επιλογές του route.',
      { stayTier: 'premium' },
      'stays',
    );
  }

  if (/παιδια|kids|children|family/.test(text)) {
    return result(
      'Προσαρμόζω το ταξίδι για οικογένεια: πιο ήπιος ρυθμός, λιγότερες συνεχόμενες στάσεις και πιο πρακτικές διαμονές.',
      { audience: 'family' },
      'itinerary',
    );
  }

  if (/βρεχει|βροχ|rain/.test(text)) {
    return result(
      'Ενεργοποιώ rainy-day mode: κρατάμε ευελιξία στα viewpoints και μετακινούμε τις φωτογραφικές στιγμές στο καλύτερο διαθέσιμο παράθυρο.',
      { weatherMode: 'rain' },
      'itinerary',
    );
  }

  return result(
    `Στο σημερινό trip μπορώ να αλλάξω διάρκεια, ρυθμό οδήγησης, τύπο διαμονής, couple/family προσαρμογή και πλάνο για βροχή. Η τρέχουσα διάρκεια είναι ${currentDuration} νύχτες.`,
    {},
    'agnes',
  );
}

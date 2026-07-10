const SERVICE_PROVIDERS = [
  {
    id: 'tech_1',
    name: 'Ahmed Al-Otaibi',
    phone: '+966501112222',
    rating: 4.8,
    photo: 'https://ui-avatars.com/api/?name=Ahmed+Al-Otaibi&size=256&background=0D8ABC&color=fff',
  },
  {
    id: 'tech_2',
    name: 'Mohammed Al-Qahtani',
    phone: '+966502223333',
    rating: 4.6,
    photo: 'https://ui-avatars.com/api/?name=Mohammed+Al-Qahtani&size=256&background=6D28D9&color=fff',
  },
  {
    id: 'tech_3',
    name: 'Rashid Al-Ghamdi',
    phone: '+966503334444',
    rating: 4.9,
    photo: 'https://ui-avatars.com/api/?name=Rashid+Al-Ghamdi&size=256&background=DC2626&color=fff',
  },
  {
    id: 'tech_4',
    name: 'Saeed Al-Harbi',
    phone: '+966504445555',
    rating: 4.7,
    photo: 'https://ui-avatars.com/api/?name=Saeed+Al-Harbi&size=256&background=059669&color=fff',
  },
  {
    id: 'tech_5',
    name: 'Faisal Al-Dosari',
    phone: '+966505556666',
    rating: 4.5,
    photo: 'https://ui-avatars.com/api/?name=Faisal+Al-Dosari&size=256&background=D97706&color=fff',
  },
];

function getAllProviders() {
  return SERVICE_PROVIDERS;
}

function getProviderById(id) {
  return SERVICE_PROVIDERS.find((p) => p.id === id);
}

module.exports = { getAllProviders, getProviderById };

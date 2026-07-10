const SERVICE_PROVIDERS = [
  {
    id: 'tech_1',
    name: 'Ahmed Al-Otaibi',
    phone: '+966501112222',
    rating: 4.8,
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    id: 'tech_2',
    name: 'Mohammed Al-Qahtani',
    phone: '+966502223333',
    rating: 4.6,
    photo: 'https://randomuser.me/api/portraits/men/45.jpg',
  },
  {
    id: 'tech_3',
    name: 'Rashid Al-Ghamdi',
    phone: '+966503334444',
    rating: 4.9,
    photo: 'https://randomuser.me/api/portraits/men/12.jpg',
  },
  {
    id: 'tech_4',
    name: 'Saeed Al-Harbi',
    phone: '+966504445555',
    rating: 4.7,
    photo: 'https://randomuser.me/api/portraits/men/78.jpg',
  },
  {
    id: 'tech_5',
    name: 'Faisal Al-Dosari',
    phone: '+966505556666',
    rating: 4.5,
    photo: 'https://randomuser.me/api/portraits/men/56.jpg',
  },
];

function getAllProviders() {
  return SERVICE_PROVIDERS;
}

function getProviderById(id) {
  return SERVICE_PROVIDERS.find((p) => p.id === id);
}

module.exports = { getAllProviders, getProviderById };

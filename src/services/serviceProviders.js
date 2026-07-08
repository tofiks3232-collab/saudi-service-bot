const SERVICE_PROVIDERS = [
  { name: 'Ahmed Al-Otaibi', phone: '+966501112222', rating: 4.8 },
  { name: 'Mohammed Al-Qahtani', phone: '+966502223333', rating: 4.6 },
  { name: 'Rashid Al-Ghamdi', phone: '+966503334444', rating: 4.9 },
];

let cursor = 0;

function assignServiceProvider() {
  const provider = SERVICE_PROVIDERS[cursor % SERVICE_PROVIDERS.length];
  cursor += 1;
  return provider;
}

module.exports = { assignServiceProvider };

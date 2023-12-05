const OPENAI_CATEGORIES = {
  hate: {
    description:
      'Content that expresses, incites, or promotes hate based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste. Hateful content aimed at non-protected groups (e.g., chess players) is harassment.',
    nip56_report_type: 'other',
    nip69: 'IH',
  },
  'hate/threatening': {
    description:
      'Hateful content that also includes violence or serious harm towards the targeted group based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste.',
    nip56_report_type: 'other',
    nip69: 'HC-bhd',
  },
  harassment: {
    description:
      'Content that expresses, incites, or promotes harassing language towards any target.',
    nip56_report_type: 'other',
    nip69: 'IL-har',
  },
  'harassment/threatening': {
    description:
      'Harassment content that also includes violence or serious harm towards any target.',
    nip56_report_type: 'other',
    nip69: 'HC-bhd',
  },
  'self-harm': {
    description:
      'Content that promotes, encourages, or depicts acts of self-harm, such as suicide, cutting, and eating disorders.',
    nip56_report_type: 'other',
    nip69: 'HC-bhd',
  },
  'self-harm/intent': {
    description:
      'Content where the speaker expresses that they are engaging or intend to engage in acts of self-harm, such as suicide, cutting, and eating disorders.',
    nip56_report_type: 'other',
    nip69: 'HC-bhd',
  },
  'self-harm/instructions': {
    description:
      'Content that encourages performing acts of self-harm, such as suicide, cutting, and eating disorders, or that gives instructions or advice on how to commit such acts.',
    nip56_report_type: 'other',
    nip69: 'HC-bhd',
  },
  sexual: {
    description:
      'Content meant to arouse sexual excitement, such as the description of sexual activity, or that promotes sexual services (excluding sex education and wellness).',
    nip56_report_type: 'nudity',
    nip69: 'NS',
  },
  'sexual/minors': {
    description:
      'Sexual content that includes an individual who is under 18 years old.',
    nip56_report_type: 'illegal',
    nip69: 'IL-csa',
  },
  violence: {
    description: 'Content that depicts death, violence, or physical injury.',
    nip56_report_type: 'other',
    nip69: 'VI',
  },
  'violence/graphic': {
    description:
      'Content that depicts death, violence, or physical injury in graphic detail.',
    nip56_report_type: 'other',
    nip69: 'VI',
  },
};

export default OPENAI_CATEGORIES;

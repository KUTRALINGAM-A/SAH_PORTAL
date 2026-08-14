export const SKILL_CATEGORIES = {
  'Frontend': [
    'React', 'Angular', 'Vue.js', 'HTML/CSS', 'JavaScript', 'TypeScript',
    'Flutter', 'React Native', 'Svelte', 'Next.js'
  ],
  'Backend': [
    'Node.js', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring Boot',
    'Go', 'Ruby on Rails', 'PHP', 'Express.js', 'Rust'
  ],
  'ML / AI': [
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
    'TensorFlow', 'PyTorch', 'Scikit-learn', 'OpenCV', 'LLMs', 'GenAI'
  ],
  'Data': [
    'Data Science', 'Data Engineering', 'SQL', 'MongoDB', 'PostgreSQL',
    'Data Visualization', 'Pandas', 'Apache Spark', 'Power BI', 'Tableau'
  ],
  'IoT / Hardware': [
    'IoT', 'Arduino', 'Raspberry Pi', 'Embedded Systems', 'VLSI',
    'PCB Design', 'Sensor Integration', '3D Printing', 'ROS'
  ],
  'Cloud / DevOps': [
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'CI/CD',
    'Linux', 'Terraform', 'Firebase', 'Supabase'
  ],
  'Design': [
    'UI/UX Design', 'Figma', 'Adobe XD', 'Graphic Design',
    'Prototyping', 'User Research', 'Adobe Illustrator', 'Canva'
  ],
  'Blockchain': [
    'Blockchain', 'Solidity', 'Web3', 'Smart Contracts', 'Ethereum',
    'DeFi', 'NFTs'
  ],
  'Cybersecurity': [
    'Network Security', 'Ethical Hacking', 'Cryptography',
    'Penetration Testing', 'SIEM', 'SOC', 'Malware Analysis'
  ],
  'Other': [
    'Technical Writing', 'Project Management', 'AR/VR', 'Game Development',
    'Mobile Development', 'API Development', 'GraphQL', 'WebSockets'
  ]
};

export const ALL_SKILLS = Object.values(SKILL_CATEGORIES).flat();

// A resume and a job for the examples. The people and companies are made up.

export const resume = {
  name: 'Jane Doe',
  title: 'Senior Data Engineer',
  email: 'jane@example.com',
  location: 'Austin, Texas',
  summary: 'Data engineer with 7 years of experience building batch and streaming pipelines.',
  skills: ['Python', 'SQL', 'Airflow', 'Postgres', 'AWS'],
  experience: [
    {
      company: 'Northwind',
      title: 'Senior Data Engineer',
      period: 'Mar 2021 – Present',
      achievements: ['Built the billing data pipeline on Airflow and AWS.', 'Cut nightly batch runtime from 6 hours to 90 minutes.'],
    },
    { company: 'Contoso', title: 'Data Engineer', period: 'Jun 2018 – Feb 2021', achievements: ['Maintained ETL jobs in Python and SQL.'] },
  ],
  education: [{ school: 'University of Texas', degree: 'BS Computer Science', year: '2018' }],
  projects: [],
  certifications: [],
  languages: ['English'],
  achievements: [],
  otherSections: [],
};

export const job = {
  title: 'Data Engineer',
  company: 'Acme',
  skills: ['Python', 'SQL', 'Spark', 'Kafka'],
  preferredSkills: ['dbt'],
  description: `Acme is hiring a Data Engineer to own our analytics platform.
- Build and run batch and streaming pipelines in Python and Spark.
- Lead incident response for the data platform.
Requirements: 5+ years of data engineering, strong SQL and Python, Kafka. Nice to have: dbt.`,
  // What the posting asks beyond named skills. In a real program, extractJobRequirements(job) reads
  // these from the description once, and the result is cached.
  requirements: [
    { text: '5+ years of data engineering experience', kind: 'experience', priority: 'required' },
    { text: 'Lead incident response for the data platform', kind: 'responsibility', priority: 'required' },
  ],
};

export const models = {
  defaultModel: 'gpt-4o-mini',
  ats: { model: 'gpt-4.1-mini', fallbackModel: 'gpt-5-mini', effort: 'minimal', fallbackEffort: 'minimal' },
  enrich: { model: 'gpt-5-nano', effort: 'low', fallbackModel: 'gpt-5-mini', fallbackEffort: 'low' },
  parse: { model: 'gpt-5-mini', effort: 'minimal', fallbackModel: 'gpt-5-mini', fallbackEffort: 'low' },
};

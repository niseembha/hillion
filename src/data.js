// Replace this one curated object and the roster when real, consented content is ready.
export const mystery = {
  number: '001',
  edition: 'THE FIRST CASE',
  studentId: 'maya-chen',
  name: 'Maya Chen',
  firstName: 'Maya',
  classYear: '2027',
  portrait: '/assets/maya.svg',
  quote: 'Some of my favorite Greenhill moments happened when nothing was planned. Take the long way to class. Say hi first. You never know what you’ll find.',
  signature: 'See you around the courtyard,',
  interests: ['Robotics captain', 'Ceramic frog enthusiast', 'Since kindergarten'],
  clues: [
    { label: 'Almost impossible', title: 'A tiny traveling companion.', text: 'I keep a tiny ceramic frog named Lentil in the left pocket of my backpack.' },
    { label: 'Very obscure', title: 'A rather unusual collection.', text: 'I have saved every fortune-cookie slip I’ve opened since fifth grade. There are 83.' },
    { label: 'An unexpected story', title: 'An early engineering project.', text: 'At nine, I built a cardboard vending machine that traded jokes for dog treats.' },
    { label: 'A little personality', title: 'Nothing goes unranked.', text: 'I make elaborate spreadsheets to rank every new matcha drink my friends and I try.' },
    { label: 'Familiar territory', title: 'Small frogs. Big following.', text: 'I make little ceramic frogs and give them to friends before big tests.' },
    { label: 'The school connection', title: 'Usually in the maker space.', text: 'I’m captain of the Greenhill robotics team and have been here since kindergarten.' },
    { label: 'The big hint', title: 'You’ve probably seen me.', text: 'I’m the senior with a purple streak in my hair who runs the robotics booth at the club fair.' }
  ]
};

const names = [
  'Aaron Brooks', 'Abigail Foster', 'Adrian Kim', 'Aisha Rahman', 'Alex Morgan', 'Alexis Rivera', 'Alice Bennett', 'Amara Okafor', 'Amelia Grant', 'Andrew Park',
  'Anika Shah', 'Anna Sullivan', 'Arjun Mehta', 'Arlo Davis', 'Audrey Collins', 'Ava Mitchell', 'Ben Carter', 'Bianca Torres', 'Blake Johnson', 'Brianna Lee',
  'Caleb Nguyen', 'Camila Reyes', 'Cameron Ellis', 'Caroline Wells', 'Carter James', 'Charlotte Hayes', 'Chloe Anderson', 'Claire Roberts', 'Cole Thompson', 'Connor Scott',
  'Daniel Wright', 'Daphne Liu', 'David Patel', 'Delilah Moore', 'Diego Santos', 'Dylan Cooper', 'Eleanor Adams', 'Elena Garcia', 'Eli Robinson', 'Elijah Turner',
  'Elizabeth Shaw', 'Ella Murphy', 'Emilia Cruz', 'Emily Parker', 'Emma Wilson', 'Eric Chang', 'Ethan Walker', 'Eva Hughes', 'Evelyn Price', 'Ezra Reed',
  'Felix Martin', 'Fiona Bell', 'Gabriel Ross', 'Gemma Clark', 'Grace Taylor', 'Grayson Miller', 'Hannah Edwards', 'Harper Lewis', 'Hazel Young', 'Henry Baker',
  'Hudson King', 'Ian Campbell', 'Imani Williams', 'Isabel Costa', 'Isabella Lopez', 'Isaac Green', 'Jack Phillips', 'Jackson Hall', 'Jacob Allen', 'Jade Lin',
  'James Nelson', 'Jasmine Ali', 'Jasper Wood', 'Jayden Harris', 'Jenna Coleman', 'Jonah White', 'Jordan Bell', 'Joseph Evans', 'Julia Flores', 'Julian Brooks',
  'Kai Tanaka', 'Kate Harrison', 'Kieran Walsh', 'Layla Ahmed', 'Leo Martinez', 'Liam O’Brien', 'Lila Stone', 'Lily Peterson', 'Logan Adams', 'Lucas Thomas',
  'Lucy Mitchell', 'Luke Freeman', 'Madeline Ross', 'Marcus Reed', 'Margot Lewis', 'Mason Clark', 'Mateo Diaz', 'Maya Chen', 'Mia Bennett', 'Miles Turner',
  'Naomi Brooks', 'Natalie Chen', 'Nathan Price', 'Nia Jackson', 'Nicholas Patel', 'Nina Kapoor', 'Noah Williams', 'Nora Green', 'Oliver Davis', 'Olivia Martin',
  'Owen Sullivan', 'Paige Anderson', 'Penelope Scott', 'Peter Huang', 'Priya Desai', 'Quinn Harper', 'Rachel Kim', 'Rafael Silva', 'Reese Campbell', 'Riley Foster',
  'Rose Walker', 'Ryan Douglas', 'Sadie Evans', 'Sam Rivera', 'Sasha Ivanov', 'Sebastian Hill', 'Sofia Ramirez', 'Sophie Baker', 'Stella Moore', 'Theo Wilson',
  'Thomas Carter', 'Tristan Lee', 'Valentina Cruz', 'Violet James', 'Vivian Park', 'Wesley Grant', 'Will Bennett', 'Wyatt Collins', 'Zara Khan', 'Zoe Nelson'
];

export const roster = names.map(name => ({ id: name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, ''), name }));
export const basePoints = [1000, 850, 700, 550, 400, 250, 100];

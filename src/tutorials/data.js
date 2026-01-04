/**
 * QBasic Nexus - Tutorial Data
 * ============================
 */

module.exports = [
    {
        id: '1-hello',
        title: 'Level 1: Hello World',
        objective: 'Print "Hello World" to the screen.',
        description: 'The PRINT command is used to display text. Strings must be enclosed in double quotes.',
        template: 'CLS\nPRINT "Hello World"',
        matchRegex: /Hello World/i,
        hint: 'Use: PRINT "Hello World"'
    },
    {
        id: '2-vars',
        title: 'Level 2: Variables',
        objective: 'Create a variable named "score" and set it to 100, then print it.',
        description: 'Variables store data. In QBasic, you can assign values directly.',
        template: 'CLS\nscore = 100\nPRINT score',
        matchRegex: /100/,
        hint: 'Type: score = 100 on one line, then PRINT score on the next.'
    },
    {
        id: '3-input',
        title: 'Level 3: Interaction',
        objective: 'Ask for the user\'s name and print it back.',
        description: 'Use INPUT to get text from the user.',
        template: 'CLS\nINPUT "Name: ", n$\nPRINT "Hi "; n$',
        matchRegex: /(name|hi)/i, // Loose matching for interaction
        hint: 'Use INPUT "Prompt ", var$ to get text input.'
    },
    {
        id: '4-loop',
        title: 'Level 4: Loops',
        objective: 'Print numbers 1 to 5 using a FOR loop.',
        description: 'FOR loops repeat code a specific number of times.',
        template: 'CLS\nFOR i = 1 TO 5\n    PRINT i\nNEXT i',
        matchRegex: /1\s*2\s*3\s*4\s*5/,
        hint: 'Start with FOR i = 1 TO 5, then PRINT i, end with NEXT i'
    }
];

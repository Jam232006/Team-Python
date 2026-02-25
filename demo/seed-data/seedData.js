// Student performance profiles
module.exports = {
    students: [
        { name: 'Kartik', email: 'kartik@insight.com' },        // Consistent, low risk
        { name: 'Daksh', email: 'daksh@insight.com' },          // Poor performer, high risk
        { name: 'Vansh', email: 'vansh@insight.com' },          // Good student, medium risk
        { name: 'Mital', email: 'mital@insight.com' },          // Excellent, low risk
        { name: 'Priya', email: 'priya@insight.com' },          // Improving student
        { name: 'Rohan', email: 'rohan@insight.com' },          // Declining performance
        { name: 'Anjali', email: 'anjali@insight.com' },        // Sporadic submitter
        { name: 'Arjun', email: 'arjun@insight.com' }           // Top performer
    ],

    assignments: [
        {
            title: 'Arrays and Linked Lists Quiz',
            desc: 'Basic concepts of arrays and linked lists',
            dueOffset: '-1 day',
            createdOffset: '-4 days'
        },
        {
            title: 'Trees and Graphs Quiz',
            desc: 'Understanding tree and graph traversal algorithms',
            dueOffset: '+4 days',
            createdOffset: '-3 days'
        },
        {
            title: 'Sorting Algorithms Quiz',
            desc: 'Comparison of different sorting techniques',
            dueOffset: '+7 days',
            createdOffset: '-2 days'
        }
    ],

    // Student answer sets for each assignment
    answerSets: {
        assignment1: {
            Kartik: { answers: ['O(1)', 'Insertion at head', 'O(n)', 'Not possible', 'O(n)', 'Array', 'O(1)', 'Fixed size', 'Bidirectional traversal', 'O(n)'], daysAgo: 3, responseTime: 1 },
            Mital: { answers: ['O(1)', 'Insertion at head', 'O(n)', 'Not possible', 'O(n)', 'Array', 'O(n)', 'Fixed size', 'Bidirectional traversal', 'O(n)'], daysAgo: 3, responseTime: 1 },
            Vansh: { answers: ['O(1)', 'Random access', 'O(n)', 'Traverse from head', 'O(n)', 'Array', 'O(n)', 'Dynamic size', 'Bidirectional traversal', 'O(1)'], daysAgo: 3, responseTime: 1 },
            Daksh: { answers: ['O(n)', 'Random access', 'O(1)', 'Use prev pointer', 'O(log n)', 'Linked List', 'O(1)', 'Dynamic size', 'Less memory', 'O(1)'], daysAgo: 3, responseTime: 1 },
            Priya: { answers: ['O(1)', 'Insertion at head', 'O(n)', 'Traverse from head', 'O(n)', 'Array', 'O(1)', 'Fixed size', 'Bidirectional traversal', 'O(n)'], daysAgo: 2, responseTime: 2 },
            Rohan: { answers: ['O(1)', 'Insertion at head', 'O(n)', 'Not possible', 'O(n)', 'Array', 'O(1)', 'Fixed size', 'Bidirectional traversal', 'O(n)'], daysAgo: 3, responseTime: 1 },
            Anjali: { answers: ['O(1)', 'Random access', 'O(n)', 'Not possible', 'O(n)', 'Linked List', 'O(1)', 'Dynamic size', 'Bidirectional traversal', 'O(n)'], daysAgo: 4, responseTime: 3 },
            Arjun: { answers: ['O(1)', 'Insertion at head', 'O(n)', 'Not possible', 'O(n)', 'Array', 'O(1)', 'Fixed size', 'Bidirectional traversal', 'O(n)'], daysAgo: 1, responseTime: 0 }
        },
        assignment2: {
            Kartik: { answers: ['Pre-order', 'Queue', '2', 'In-order', 'Stack', '0', 'Adjacency Matrix', 'O(V + E)', 'O(log n)', 'Post-order'], daysAgo: 2, responseTime: 1 },
            Mital: { answers: ['Pre-order', 'Queue', '2', 'In-order', 'Stack', '0', 'Adjacency Matrix', 'O(V + E)', 'O(log n)', 'In-order'], daysAgo: 2, responseTime: 1 },
            Vansh: { answers: ['Pre-order', 'Queue', '3', 'Pre-order', 'Stack', '1', 'Adjacency List', 'O(V + E)', 'O(n)', 'In-order'], daysAgo: 2, responseTime: 1 },
            Daksh: null,
            Priya: { answers: ['Pre-order', 'Queue', '2', 'In-order', 'Stack', '0', 'Adjacency Matrix', 'O(V^2)', 'O(log n)', 'In-order'], daysAgo: 1, responseTime: 1 },
            Rohan: { answers: ['Post-order', 'Queue', '3', 'Pre-order', 'Queue', '1', 'Adjacency Matrix', 'O(V + E)', 'O(n)', 'Pre-order'], daysAgo: 3, responseTime: 2 },
            Anjali: null,
            Arjun: { answers: ['Pre-order', 'Queue', '2', 'In-order', 'Stack', '0', 'Adjacency Matrix', 'O(V + E)', 'O(log n)', 'Post-order'], daysAgo: 0, responseTime: 0 }
        },
        assignment3: {
            Kartik: { answers: ['O(n log n)', 'Merge Sort', 'O(n^2)', 'Merge Sort', 'O(log n)', 'Insertion Sort', 'O(n log n)', 'Insertion Sort', 'O(n log n)', 'Counting Sort'], daysAgo: 1, responseTime: 1 },
            Mital: { answers: ['O(n log n)', 'Merge Sort', 'O(n^2)', 'Merge Sort', 'O(log n)', 'Insertion Sort', 'O(n log n)', 'Bubble Sort', 'O(n log n)', 'Counting Sort'], daysAgo: 1, responseTime: 1 },
            Vansh: { answers: ['O(n log n)', 'Quick Sort', 'O(n^2)', 'Merge Sort', 'O(1)', 'Quick Sort', 'O(n log n)', 'Quick Sort', 'O(n log n)', 'Merge Sort'], daysAgo: 1, responseTime: 1 },
            Daksh: { answers: ['O(n)', 'Quick Sort', 'O(n)', 'Bubble Sort', 'O(1)', 'Merge Sort', 'O(n)', 'Quick Sort', 'O(n)', 'Quick Sort'], daysAgo: 1, responseTime: 1 },
            Priya: { answers: ['O(n log n)', 'Merge Sort', 'O(n^2)', 'Merge Sort', 'O(log n)', 'Insertion Sort', 'O(n log n)', 'Insertion Sort', 'O(n log n)', 'Counting Sort'], daysAgo: 1, responseTime: 1 },
            Rohan: { answers: ['O(n)', 'Bubble Sort', 'O(n)', 'Quick Sort', 'O(n)', 'Bubble Sort', 'O(n^2)', 'Selection Sort', 'O(n)', 'Insertion Sort'], daysAgo: 2, responseTime: 2 },
            Anjali: { answers: ['O(n log n)', 'Quick Sort', 'O(n^2)', 'Merge Sort', 'O(1)', 'Quick Sort', 'O(n log n)', 'Insertion Sort', 'O(n log n)', 'Merge Sort'], daysAgo: 0, responseTime: 0 },
            Arjun: { answers: ['O(n log n)', 'Merge Sort', 'O(n^2)', 'Merge Sort', 'O(log n)', 'Insertion Sort', 'O(n log n)', 'Insertion Sort', 'O(n log n)', 'Counting Sort'], daysAgo: 0, responseTime: 0 }
        }
    }
};
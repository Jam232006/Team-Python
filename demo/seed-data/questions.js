// Assignment questions data
module.exports = {
    assignment1: [
        { text: 'What is the time complexity of accessing an element in an array by index?', correct: 'O(1)', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'] },
        { text: 'Which operation is most efficient in a linked list?', correct: 'Insertion at head', options: ['Random access', 'Insertion at head', 'Binary search', 'Sorting'] },
        { text: 'What is the space complexity of an array of size n?', correct: 'O(n)', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'] },
        { text: 'In a singly linked list, how do you access the previous node?', correct: 'Not possible', options: ['Use prev pointer', 'Not possible', 'Traverse from head', 'Use index'] },
        { text: 'What is the worst-case time complexity for searching in an unsorted array?', correct: 'O(n)', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'] },
        { text: 'Which data structure uses contiguous memory allocation?', correct: 'Array', options: ['Array', 'Linked List', 'Tree', 'Graph'] },
        { text: 'What is the time complexity of deleting the last element from a singly linked list?', correct: 'O(n)', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'] },
        { text: 'Which is true about arrays?', correct: 'Fixed size', options: ['Dynamic size', 'Fixed size', 'No indexing', 'Non-sequential'] },
        { text: 'What advantage does a doubly linked list have over a singly linked list?', correct: 'Bidirectional traversal', options: ['Less memory', 'Faster search', 'Bidirectional traversal', 'Simpler code'] },
        { text: 'What is the time complexity of inserting an element at the beginning of an array?', correct: 'O(n)', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'] }
    ],
    assignment2: [
        { text: 'What traversal method visits the root node first?', correct: 'Pre-order', options: ['In-order', 'Pre-order', 'Post-order', 'Level-order'] },
        { text: 'Which data structure is used in Breadth-First Search (BFS)?', correct: 'Queue', options: ['Stack', 'Queue', 'Array', 'Heap'] },
        { text: 'What is the maximum number of children a binary tree node can have?', correct: '2', options: ['1', '2', '3', 'Unlimited'] },
        { text: 'In which traversal is the left subtree visited before the root?', correct: 'In-order', options: ['Pre-order', 'In-order', 'Post-order', 'None'] },
        { text: 'What data structure is used in Depth-First Search (DFS)?', correct: 'Stack', options: ['Stack', 'Queue', 'Heap', 'Array'] },
        { text: 'What is the height of a tree with only one node?', correct: '0', options: ['0', '1', '2', '-1'] },
        { text: 'Which graph representation uses more space for sparse graphs?', correct: 'Adjacency Matrix', options: ['Adjacency List', 'Adjacency Matrix', 'Edge List', 'All same'] },
        { text: 'What is the time complexity of BFS in a graph with V vertices and E edges?', correct: 'O(V + E)', options: ['O(V)', 'O(E)', 'O(V + E)', 'O(V * E)'] },
        { text: 'In a complete binary tree with n nodes, what is the height?', correct: 'O(log n)', options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'] },
        { text: 'Which traversal gives nodes in ascending order in a BST?', correct: 'In-order', options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'] }
    ],
    assignment3: [
        { text: 'What is the best case time complexity of Quick Sort?', correct: 'O(n log n)', options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'] },
        { text: 'Which sorting algorithm is stable?', correct: 'Merge Sort', options: ['Quick Sort', 'Merge Sort', 'Heap Sort', 'Selection Sort'] },
        { text: 'What is the worst-case time complexity of Bubble Sort?', correct: 'O(n^2)', options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'] },
        { text: 'Which sorting algorithm uses divide and conquer?', correct: 'Merge Sort', options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'] },
        { text: 'What is the space complexity of in-place Quick Sort?', correct: 'O(log n)', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'] },
        { text: 'Which sort works best for nearly sorted data?', correct: 'Insertion Sort', options: ['Quick Sort', 'Merge Sort', 'Insertion Sort', 'Heap Sort'] },
        { text: 'What is the average case time complexity of Quick Sort?', correct: 'O(n log n)', options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'] },
        { text: 'Which sorting algorithm has O(n) best case?', correct: 'Bubble Sort', options: ['Quick Sort', 'Bubble Sort', 'Merge Sort', 'Heap Sort'] },
        { text: 'What is the time complexity of Heap Sort?', correct: 'O(n log n)', options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'] },
        { text: 'Which sort is NOT comparison-based?', correct: 'Counting Sort', options: ['Quick Sort', 'Merge Sort', 'Counting Sort', 'Heap Sort'] }
    ]
};

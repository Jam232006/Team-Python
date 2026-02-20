const db = require('./db/database');
const bcrypt = require('bcryptjs');
const { calculateRisk, updateStreak } = require('./utils/riskEngine');

async function seed() {
    // Wait a moment for database initialization to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    const hashedPassword = await bcrypt.hash('password123', 10);

    db.serialize(() => {
        // Clear existing data
        db.run("DELETE FROM users");
        db.run("DELETE FROM activity_logs");
        db.run("DELETE FROM risk_scores");
        db.run("DELETE FROM risk_history");
        db.run("DELETE FROM alerts");
        db.run("DELETE FROM classes");
        db.run("DELETE FROM class_members");
        db.run("DELETE FROM assignments");
        db.run("DELETE FROM assignment_questions");
        db.run("DELETE FROM assignment_submissions");
        db.run("DELETE FROM student_answers");
        db.run("DELETE FROM invites");
        db.run("DELETE FROM submission_streaks");

        // Insert Admin
        db.run(`INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@insight.com', ?, 'admin')`, [hashedPassword]);

        // Insert Mentor Sarah
        db.run(`INSERT INTO users (name, email, password, role) VALUES ('Sarah Johnson', 'sarah@insight.com', ?, 'mentor')`, [hashedPassword], function () {
            const mentorId = this.lastID;

            // Create DS 2025 Class
            db.run(`INSERT INTO classes (mentor_id, name, description, invite_code) VALUES (?, 'DS 2025', 'Data Structures Course 2025', 'DS2025')`, [mentorId], function () {
                const classId = this.lastID;

                // Insert Students
                const students = [
                    { name: 'Kartik', email: 'kartik@insight.com' },
                    { name: 'Daksh', email: 'daksh@insight.com' },
                    { name: 'Vansh', email: 'vansh@insight.com' },
                    { name: 'Mital', email: 'mital@insight.com' }
                ];

                const studentIds = {};
                let studentsCreated = 0;

                students.forEach((student, index) => {
                    db.run(`INSERT INTO users (name, email, password, role, mentor_id) VALUES (?, ?, ?, 'student', ?)`,
                        [student.name, student.email, hashedPassword, mentorId], function () {
                            const studentId = this.lastID;
                            studentIds[student.name] = studentId;

                            // Add student to class
                            db.run(`INSERT INTO class_members (class_id, student_id) VALUES (?, ?)`, [classId, studentId]);

                            studentsCreated++;
                            
                            // After all students are created, create assignments
                            if (studentsCreated === students.length) {
                                setTimeout(() => createAssignments(mentorId, classId, studentIds), 200);
                            }
                        });
                });

                async function createAssignments(mentorId, classId, studentIds) {
                    console.log('📝 Creating assignments...');
                    
                    const assignmentQuestions = {
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

                    // Student performance profiles (answers, when they submitted, and response time)
                    const studentProfiles = {
                        assignment1: {
                            Kartik: { answers: ['O(1)', 'Insertion at head', 'O(n)', 'Not possible', 'O(n)', 'Array', 'O(1)', 'Fixed size', 'Bidirectional traversal', 'O(n)'], daysAgo: 3, responseTime: 1 },
                            Mital: { answers: ['O(1)', 'Insertion at head', 'O(n)', 'Not possible', 'O(n)', 'Array', 'O(n)', 'Fixed size', 'Bidirectional traversal', 'O(n)'], daysAgo: 3, responseTime: 1 },
                            Vansh: { answers: ['O(1)', 'Random access', 'O(n)', 'Traverse from head', 'O(n)', 'Array', 'O(n)', 'Dynamic size', 'Bidirectional traversal', 'O(1)'], daysAgo: 3, responseTime: 1 },
                            Daksh: { answers: ['O(n)', 'Random access', 'O(1)', 'Use prev pointer', 'O(log n)', 'Linked List', 'O(1)', 'Dynamic size', 'Less memory', 'O(1)'], daysAgo: 3, responseTime: 1 }
                        },
                        assignment2: {
                            Kartik: { answers: ['Pre-order', 'Queue', '2', 'In-order', 'Stack', '0', 'Adjacency Matrix', 'O(V + E)', 'O(log n)', 'Post-order'], daysAgo: 2, responseTime: 1 },
                            Mital: { answers: ['Pre-order', 'Queue', '2', 'In-order', 'Stack', '0', 'Adjacency Matrix', 'O(V + E)', 'O(log n)', 'In-order'], daysAgo: 2, responseTime: 1 },
                            Vansh: { answers: ['Pre-order', 'Queue', '3', 'Pre-order', 'Stack', '1', 'Adjacency List', 'O(V + E)', 'O(n)', 'In-order'], daysAgo: 2, responseTime: 1 },
                            Daksh: null // Not submitted - creates missed submission
                        },
                        assignment3: {
                            Kartik: { answers: ['O(n log n)', 'Merge Sort', 'O(n^2)', 'Merge Sort', 'O(log n)', 'Insertion Sort', 'O(n log n)', 'Insertion Sort', 'O(n log n)', 'Counting Sort'], daysAgo: 1, responseTime: 1 },
                            Mital: { answers: ['O(n log n)', 'Merge Sort', 'O(n^2)', 'Merge Sort', 'O(log n)', 'Insertion Sort', 'O(n log n)', 'Bubble Sort', 'O(n log n)', 'Counting Sort'], daysAgo: 1, responseTime: 1 },
                            Vansh: { answers: ['O(n log n)', 'Quick Sort', 'O(n^2)', 'Merge Sort', 'O(1)', 'Quick Sort', 'O(n log n)', 'Quick Sort', 'O(n log n)', 'Merge Sort'], daysAgo: 1, responseTime: 1 },
                            Daksh: { answers: ['O(n)', 'Quick Sort', 'O(n)', 'Bubble Sort', 'O(1)', 'Merge Sort', 'O(n)', 'Quick Sort', 'O(n)', 'Quick Sort'], daysAgo: 1, responseTime: 1 }
                        }
                    };

                    const assignments = [
                        { title: 'Arrays and Linked Lists Quiz', desc: 'Basic concepts of arrays and linked lists', dueOffset: '-1 day', createdOffset: '-4 days', key: 'assignment1' },
                        { title: 'Trees and Graphs Quiz', desc: 'Understanding tree and graph traversal algorithms', dueOffset: '+4 days', createdOffset: '-3 days', key: 'assignment2' },
                        { title: 'Sorting Algorithms Quiz', desc: 'Comparison of different sorting techniques', dueOffset: '+7 days', createdOffset: '-2 days', key: 'assignment3' }
                    ];

                    let assignmentsCompleted = 0;

                    assignments.forEach((assignment, idx) => {
                        db.run(`INSERT INTO assignments (mentor_id, class_id, title, description, due_date, status, created_at) 
                                VALUES (?, ?, ?, ?, datetime('now', '${assignment.dueOffset}'), 'active', datetime('now', '${assignment.createdOffset}'))`,
                            [mentorId, classId, assignment.title, assignment.desc], function () {
                                const assignmentId = this.lastID;
                                const questions = assignmentQuestions[assignment.key];
                                
                                // Insert questions
                                let questionsInserted = 0;
                                questions.forEach((q, qIdx) => {
                                    db.run(`INSERT INTO assignment_questions (assignment_id, question_text, question_type, correct_answer, options, points, question_order)
                                            VALUES (?, ?, 'multiple_choice', ?, ?, 10, ?)`,
                                        [assignmentId, q.text, q.correct, JSON.stringify(q.options), qIdx], function() {
                                            questionsInserted++;
                                            if (questionsInserted === questions.length) {
                                                createSubmissions(assignmentId, assignment.key, assignment.title, questions, studentProfiles[assignment.key]);
                                            }
                                        });
                                });
                            });

                        function createSubmissions(assignmentId, assignmentKey, assignmentTitle, questions, profiles) {
                            let submissionsCreated = 0;
                            const studentsCount = Object.keys(profiles).length;
                            
                            Object.keys(profiles).forEach(name => {
                                const studentId = studentIds[name];
                                const profile = profiles[name];
                                
                                if (!profile) {
                                    // Missed submission (for Daksh in assignment2)
                                    db.run(`INSERT INTO assignment_submissions (assignment_id, student_id, status, submitted_at, score, max_score)
                                            VALUES (?, ?, 'pending', NULL, 0, 100)`, [assignmentId, studentId], () => {
                                        db.run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days, title) 
                                                VALUES (?, 'assignment', datetime('now', '-10 days'), 'missed', 10, ?)`,
                                            [studentId, assignmentTitle], () => {
                                                submissionsCreated++;
                                                checkCompletion();
                                            });
                                    });
                                } else {
                                    // Normal submission
                                    const { answers, daysAgo, responseTime } = profile;
                                    let totalScore = 0;
                                    
                                    db.run(`INSERT INTO assignment_submissions (assignment_id, student_id, status, submitted_at, score, max_score, response_time_days)
                                            VALUES (?, ?, 'submitted', datetime('now', '-${daysAgo} days'), 0, 100, ?)`,
                                        [assignmentId, studentId, responseTime], function() {
                                            const submissionId = this.lastID;
                                            
                                            let answersInserted = 0;
                                            answers.forEach((answer, qIdx) => {
                                                const isCorrect = answer === questions[qIdx].correct ? 1 : 0;
                                                totalScore += isCorrect * 10;
                                                
                                                db.run(`INSERT INTO student_answers (submission_id, question_id, student_answer, is_correct, points_earned)
                                                        VALUES (?, (SELECT question_id FROM assignment_questions WHERE assignment_id = ? AND question_order = ?), ?, ?, ?)`,
                                                    [submissionId, assignmentId, qIdx, answer, isCorrect, isCorrect * 10], function() {
                                                        answersInserted++;
                                                        if (answersInserted === answers.length) {
                                                            db.run(`UPDATE assignment_submissions SET score = ? WHERE submission_id = ?`, [totalScore, submissionId], async () => {
                                                                // Log activity (but don't update streak yet - will do it once at the end)
                                                                db.run(`INSERT INTO activity_logs (user_id, activity_type, submission_date, status, response_time_days, title) 
                                                                        VALUES (?, 'assignment', datetime('now', '-${daysAgo} days'), 'submitted', ?, ?)`,
                                                                    [studentId, responseTime, assignmentTitle]);
                                                                
                                                                submissionsCreated++;
                                                                checkCompletion();
                                                            });
                                                        }
                                                    });
                                            });
                                        });
                                }
                            });

                            function checkCompletion() {
                                if (submissionsCreated === studentsCount) {
                                    console.log(`  ✓ ${assignmentTitle} completed`);
                                    assignmentsCompleted++;
                                    if (assignmentsCompleted === assignments.length) {
                                        setTimeout(() => calculateAllRisks(), 500);
                                    }
                                }
                            }
                        }
                    });

                    async function calculateAllRisks() {
                        console.log('\n📊 Updating streaks and calculating risk scores...');
                        
                        // First, update streaks for all students based on their submission history
                        for (const name of Object.keys(studentIds)) {
                            const studentId = studentIds[name];
                            try {
                                // Get all submission dates for this student
                                const submissions = await new Promise((resolve, reject) => {
                                    db.all(
                                        `SELECT DISTINCT submitted_at FROM assignment_submissions 
                                         WHERE student_id = ? AND status = 'submitted' 
                                         ORDER BY submitted_at ASC`,
                                        [studentId],
                                        (err, rows) => err ? reject(err) : resolve(rows)
                                    );
                                });
                                
                                // Update streak for each submission date sequentially
                                for (const sub of submissions) {
                                    await updateStreak(studentId, new Date(sub.submitted_at));
                                }
                            } catch (err) {
                                console.error(`Error updating streak for ${name}:`, err);
                            }
                        }
                        
                        // Now calculate risk scores
                        const results = [];
                        
                        for (const name of Object.keys(studentIds)) {
                            const studentId = studentIds[name];
                            try {
                                const riskData = await calculateRisk(studentId);
                                results.push({ name, ...riskData });
                                
                                // Insert risk history entry
                                db.run(`INSERT INTO risk_history (user_id, risk_score, risk_level, recorded_at)
                                        VALUES (?, ?, ?, datetime('now'))`,
                                    [studentId, riskData.score, riskData.riskLevel]);
                            } catch (err) {
                                console.error(`Error calculating risk for ${name}:`, err);
                            }
                        }
                        
                        console.log('\n✅ Database seeded successfully!');
                        console.log('📚 Class Created: DS 2025');
                        console.log('👨‍🏫 Mentor: sarah@insight.com (password: password123)');
                        console.log('👨‍🎓 Students: kartik@insight.com, daksh@insight.com, vansh@insight.com, mital@insight.com (all passwords: password123)');
                        console.log('📝 3 Assignments created with varied submissions');
                        console.log('\n📊 Risk Analytics (calculated by engine):');
                        results.sort((a, b) => b.score - a.score).forEach(r => {
                            const streakInfo = r.breakdown.current_streak >= 3 ? ` 🔥 ${r.breakdown.current_streak} day streak` : '';
                            console.log(`   - ${r.name}: ${r.riskLevel} Risk (Score: ${r.score})${streakInfo}`);
                            console.log(`     └─ Breakdown: Missed/Late: ${r.breakdown.metric1}, Inactivity: ${r.breakdown.metric3}, Score Penalty: ${r.breakdown.metric4_score_penalty.toFixed(1)}`);
                        });
                        console.log('\n⚠️  All alerts and risk history generated automatically by the backend!');
                        
                        // Force exit after completion
                        setTimeout(() => process.exit(0), 1000);
                    }
                }
            });
        });
    });
}

seed();

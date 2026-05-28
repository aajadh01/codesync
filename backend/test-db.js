require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const List = require('./models/List');
const Problem = require('./models/Problem');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codesync';

async function runTests() {
  console.log('--- CODESYNC DATA CAPABILITIES TEST ---');
  console.log(`Connecting to: ${MONGODB_URI}`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✔ Connected to MongoDB successfully.');

    // Cleanup previous test data if any
    await User.deleteMany({ email: /test-user-codesync/ });
    await List.deleteMany({ name: 'Test Integration List' });
    console.log('✔ Previous test data cleaned up.');

    // 1. Create Users
    console.log('\nStep 1: Creating test users...');
    const userA = await User.create({
      username: 'testuser_a',
      email: 'test-user-codesync-a@domain.com',
      password: 'password123',
      avatar: 'avatar1',
    });
    console.log(`✔ User A Created: ${userA.username} (ID: ${userA._id})`);

    const userB = await User.create({
      username: 'testuser_b',
      email: 'test-user-codesync-b@domain.com',
      password: 'password123',
      avatar: 'avatar2',
    });
    console.log(`✔ User B Created: ${userB.username} (ID: ${userB._id})`);

    // Password verification test
    const isPasswordValid = await userA.comparePassword('password123');
    console.log(`✔ Password validation check: ${isPasswordValid ? 'PASS' : 'FAIL'}`);

    // 2. Create Shared List
    console.log('\nStep 2: Creating a shared problem list...');
    const list = await List.create({
      name: 'Test Integration List',
      inviteCode: 'TEST99',
      owner: userA._id,
      members: [userA._id],
    });
    console.log(`✔ List created: "${list.name}" with Invite Code: ${list.inviteCode}`);

    // 3. User B Joins List
    console.log('\nStep 3: User B joining list via invite code...');
    const listToJoin = await List.findOne({ inviteCode: 'TEST99' });
    if (!listToJoin) throw new Error('List not found');

    if (!listToJoin.members.includes(userB._id)) {
      listToJoin.members.push(userB._id);
      await listToJoin.save();
    }
    console.log(`✔ User B successfully added to list. Total members: ${listToJoin.members.length}`);

    // 4. Add Problems
    console.log('\nStep 4: Adding LeetCode problems to the list with custom topics...');
    const prob1 = await Problem.create({
      title: 'Two Sum',
      difficulty: 'Easy',
      url: 'https://leetcode.com/problems/two-sum/',
      list: list._id,
      addedBy: userA._id,
      solvedBy: [],
      topic: 'General',
    });
    console.log(`✔ Problem 1 added: "${prob1.title}" (${prob1.difficulty}) under topic: "${prob1.topic}"`);

    const prob2 = await Problem.create({
      title: 'Course Schedule',
      difficulty: 'Medium',
      url: 'https://leetcode.com/problems/course-schedule/',
      list: list._id,
      addedBy: userA._id,
      solvedBy: [],
      topic: 'Graphs',
    });
    console.log(`✔ Problem 2 added: "${prob2.title}" (${prob2.difficulty}) under topic: "${prob2.topic}"`);

    // 5. Track Solved States
    console.log('\nStep 5: Toggling solve status...');
    // User A solves problem 1
    prob1.solvedBy.push(userA._id);
    await prob1.save();
    console.log(`✔ User A marked "${prob1.title}" as solved.`);

    // Both users solve problem 2
    prob2.solvedBy.push(userA._id);
    prob2.solvedBy.push(userB._id);
    await prob2.save();
    console.log(`✔ Both users marked "${prob2.title}" as solved.`);

    // 6. Aggregate solved statistics and rankings
    console.log('\nStep 6: Calculating metrics & rankings...');
    const allProblems = await Problem.find({ list: list._id });
    
    const rankings = [userA, userB].map((u) => {
      const solves = allProblems.filter((p) => p.solvedBy.includes(u._id));
      return {
        username: u.username,
        solvesCount: solves.length,
      };
    });

    console.log('Rankings results:');
    rankings.sort((a, b) => b.solvesCount - a.solvesCount);
    rankings.forEach((r, idx) => {
      console.log(`  Rank ${idx + 1}: ${r.username} with ${r.solvesCount} solves.`);
    });

    // Cleanup test data to keep database clean
    console.log('\nStep 7: Tearing down test data...');
    await Problem.deleteMany({ list: list._id });
    await List.deleteOne({ _id: list._id });
    await User.deleteMany({ _id: { $in: [userA._id, userB._id] } });
    console.log('✔ Cleaned up test entries from database.');

    console.log('\n✔ All tests passed successfully!');
  } catch (error) {
    console.error('\n✖ Test Execution Failure:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTests();

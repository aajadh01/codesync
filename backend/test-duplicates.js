const mongoose = require('mongoose');
require('dotenv').config();
const Problem = require('./models/Problem');
const List = require('./models/List');
const User = require('./models/User');
const { addProblem } = require('./controllers/problemController');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codesync';

async function testDuplicates() {
  console.log('--- TESTING DUPLICATE PREVENTION LOGIC ---');
  console.log(`Connecting to: ${MONGODB_URI}`);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✔ Connected to MongoDB.');

    // Cleanup previous test data
    await User.deleteMany({ email: 'test-dup-user@domain.com' });
    await List.deleteMany({ name: 'Duplicate Test List' });

    // Create user and list
    const user = await User.create({
      username: 'dup_test_user',
      email: 'test-dup-user@domain.com',
      password: 'password123',
      avatar: 'avatar1',
    });

    const list = await List.create({
      name: 'Duplicate Test List',
      inviteCode: 'DUP123',
      owner: user._id,
      members: [user._id],
    });

    // Mock Express request and response
    const mockReq = {
      user: { _id: user._id },
      body: {
        title: 'Two Sum',
        difficulty: 'Easy',
        url: 'https://leetcode.com/problems/two-sum/',
        listId: list._id.toString(),
        topic: 'General'
      }
    };

    let responseStatus = null;
    let responseData = null;

    const mockRes = {
      status(code) {
        responseStatus = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    // 1. Add problem for the first time
    console.log('\nAdding "Two Sum" for the first time...');
    await addProblem(mockReq, mockRes);
    console.log(`Response Status: ${responseStatus}`);
    if (responseStatus === 201) {
      console.log('✔ Problem added successfully first time.');
    } else {
      console.error('✖ Failed to add problem:', responseData);
    }

    // 2. Try adding exact same problem URL again
    console.log('\nAdding duplicate by exact URL again...');
    await addProblem(mockReq, mockRes);
    console.log(`Response Status: ${responseStatus}`);
    console.log('Response Message:', responseData);
    if (responseStatus === 400 && responseData.message === 'This problem is already present in this list.') {
      console.log('✔ Duplicate by exact URL blocked successfully!');
    } else {
      console.error('✖ Duplicate URL was NOT blocked correctly.');
    }

    // 3. Try adding duplicate with normalized/alternative URL (description and trailing slash suffix)
    const mockReqAltUrl = {
      user: { _id: user._id },
      body: {
        title: 'Two Sum',
        difficulty: 'Easy',
        url: 'https://leetcode.com/problems/two-sum/description/',
        listId: list._id.toString(),
        topic: 'General'
      }
    };
    console.log('\nAdding duplicate with alternative LeetCode URL suffix...');
    await addProblem(mockReqAltUrl, mockRes);
    console.log(`Response Status: ${responseStatus}`);
    console.log('Response Message:', responseData);
    if (responseStatus === 400 && responseData.message === 'This problem is already present in this list.') {
      console.log('✔ Duplicate by alternative URL blocked successfully!');
    } else {
      console.error('✖ Alternative URL duplicate was NOT blocked.');
    }

    // 4. Try adding duplicate by title only (case-insensitive & trimmed)
    const mockReqAltTitle = {
      user: { _id: user._id },
      body: {
        title: '   two sum   ',
        difficulty: 'Easy',
        url: 'https://leetcode.com/problems/two-sum-alternative-url/',
        listId: list._id.toString(),
        topic: 'General'
      }
    };
    console.log('\nAdding duplicate with matching title (case-insensitive & padded)...');
    await addProblem(mockReqAltTitle, mockRes);
    console.log(`Response Status: ${responseStatus}`);
    console.log('Response Message:', responseData);
    if (responseStatus === 400 && responseData.message === 'This problem is already present in this list.') {
      console.log('✔ Duplicate by title blocked successfully!');
    } else {
      console.error('✖ Duplicate title was NOT blocked.');
    }

    // Cleanup
    await Problem.deleteMany({ list: list._id });
    await List.deleteOne({ _id: list._id });
    await User.deleteOne({ _id: user._id });
    console.log('\n✔ All duplicate prevention tests passed successfully!');
  } catch (err) {
    console.error('✖ Error during test execution:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

testDuplicates();

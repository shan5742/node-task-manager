const request = require("supertest");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../src/app");
const User = require("../src/models/user");

const userOneId = new mongoose.Types.ObjectId();
const userOne = {
  _id: userOneId,
  name: "Test User",
  email: "test@test.com",
  password: "test1234",
  tokens: [
    {
      token: jwt.sign({ _id: userOneId }, process.env.JWT_SECRET),
    },
  ],
};

beforeEach(async () => {
  await User.deleteMany();
  await new User(userOne).save();
});

test("Should signup a new user", async () => {
  const response = await request(app)
    .post("/users")
    .send({
      name: "Bob",
      email: "bob@example.com",
      password: "test1234",
    })
    .expect(201);

  // Check that the database was changed correctly
  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();

  // Check the response
  expect(response.body).toMatchObject({
    user: {
      name: "Bob",
      email: "bob@example.com",
    },
    token: user.tokens[0].token,
  });
  expect(user.password).not.toBe("test1234");
});

test("Should login existing user", async () => {
  const response = await request(app)
    .post("/users/login")
    .send({
      email: userOne.email,
      password: userOne.password,
    })
    .expect(200);
  // Fetch user
  const user = await User.findById(userOneId);
  // Check token in response matches users second token
  expect(response.body.token).toBe(user.tokens[1].token);
});

test("Should not login non existent user", async () => {
  await request(app)
    .post("/users/login")
    .send({
      email: "someemail@someemail.com",
      password: "someIncorrectData",
    })
    .expect(400);
});

test("Should get profile for user", async () => {
  await request(app)
    .get("/users/me")
    .set("Authorization", `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
});

test("Should not get profile for unauthenticated user", async () => {
  await request(app).get("/users/me").send().expect(401);
});

test("Should delete account for user", async () => {
  await request(app)
    .delete("/users/me")
    .set("Authorization", `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);
  // Fetch user
  const user = await User.findById(userOneId);
  //confirm deletion
  expect(user).toBeNull();
});

test("Should not delete account for unauthorized user", async () => {
  await request(app).delete("/users/me").send().expect(401);
});
"use strict"

let axios = require('axios')
let TurndownService = require('turndown')
const NodeCache = require( "node-cache" );
const questionCache = new NodeCache( { stdTTL: 3600, checkperiod: 600 } );

let turndownService = new TurndownService()

const urls = {
  base: `https://leetcode.com`,
  problems: `https://leetcode.com/api/problems/all/`,
  graphql: `https://leetcode.com/graphql`
}

async function getQuestions() {
  let questions = {
    idMap: {},
    titleMap: {},
  }
  let res = await axios.get(urls.problems)
  res.data.stat_status_pairs.forEach(q => {
    let question = {
      id: q.stat.question_id,
      title: q.stat.question__title,
      title_slug: q.stat.question__title_slug,
      difficulty: q.difficulty.level,
      paid_only: q.paid_only
    }
    questions.idMap[question.id] = question
    questions.titleMap[question.title] = question
  })
  return questions
}

async function getQuestionById(id, questions) {
  let questionName = questions.idMap[id].title_slug
  if (!questionName) {
    throw "Invalid Question ID"
  }
  return await getQuestionInfo(questionName)
}

async function getQuestionByTitle(title, questions) {
  let questionName = questions.titleMap[title].title_slug
  if (!questionName) {
    throw "Invalid Question Title"
  }
  return await getQuestionInfo(questionName)
}

async function getQuestionInfo(questionName) {
  let cachedQuestion = questionCache.get(questionName)
  if (cachedQuestion) {
    return cachedQuestion
  }
  let query = [
    'query questionData($titleSlug: String!) {',
    '  question(titleSlug: $titleSlug) {',
    '    questionId',
    '    title',
    '    translatedTitle',
    '    titleSlug',
    '    content',
    '    translatedContent',
    '    isPaidOnly',
    '    difficulty',
    '    stats',
    '    sampleTestCase',
    '    likes',
    '    dislikes',
    '    solution {\n      id\n      canSeeDetail\n      paidOnly\n      __typename\n    }',
    '  }',
    '}'
  ].join('\n')
  let req = {
    operationName: "questionData",
    query:query,
    variables: {titleSlug: questionName},
  }
  let res = await axios.post(urls.graphql ,req)
  let question = res.data.data.question
  question.markdownContent = turndownService.turndown(question.content)
  questionCache.set(questionName, question)
  return question
}

(async() => {
  let questions = await getQuestions()
  console.log(await getQuestionByTitle("Longest Palindromic Substring", questions))
})()


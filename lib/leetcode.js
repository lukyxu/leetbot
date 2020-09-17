'use strict'

let NodeCache = require( "node-cache" );

let axios = require('axios')
let urls = require('./config')

let questionCache = new NodeCache( { stdTTL: 3600, checkperiod: 600 } );

let questions

class Leetcode {
  static async getQuestions() {
    console.log("Getting Questions")
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
      if (question.id === 1) {
        console.log(q)
      }
      questions.idMap[question.id] = question
      questions.titleMap[question.title.toLowerCase()] = question
    })
    return questions
  }

  static async getQuestionById(id) {
    if (!questions) {
      questions = await Leetcode.getQuestions()
    }
    let question = questions.idMap[id]
    if (!question) {
      throw "Invalid Question ID"
    }
    let questionName = question.title_slug
    return await Leetcode.getQuestionInfo(questionName)
  }

  static async getQuestionByTitle(title) {
    if (!questions) {
      questions = await Leetcode.getQuestions()
    }
    let question = questions.titleMap[title.toLowerCase()]
    if (!question) {
      throw "Invalid Question Title"
    }
    let questionName = question.title_slug
    return await Leetcode.getQuestionInfo(questionName)
  }
  
  static async getRandomQuestion(difficulty) {
    if (!questions) {
      questions = await Leetcode.getQuestions()
    }
    let question = {}
    do {
      let keys = Object.keys(questions.idMap);
      let q = questions.idMap[keys[ keys.length * Math.random() << 0]];
      if (typeof isdifficulty == 'number' && q.difficulty != difficulty) {
        continue
      }
      let questionName = q.title_slug
      question = await Leetcode.getQuestionInfo(questionName)
    } while(!question.content)
    return question
  }

  static async getQuestionInfo(questionName) {
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
    questionCache.set(questionName, question)
    return question
  }
}

module.exports = Leetcode
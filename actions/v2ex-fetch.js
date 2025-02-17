const fs = require("fs")
const ejs = require("ejs")
const moment = require("moment")
const { generateImg } = require("./v2ex-tools.js")

const data = {
  v2ex_posts: [],
  date: "",
}

async function fetch_posts() {
  const fetch_opts = {
    timeout: 10 * 1000, // 10s
  }
  let body = await fetch("https://www.v2ex.com/api/topics/hot.json", fetch_opts)
  let res = await body.json()
  res.forEach((item) => {
    item.createdTimeFormat = moment(item.created * 1000).format(
      "YYYY-MM-DD HH:mm:ss"
    )
  })
  let PostsData = await createPostsImg(res)
  data.date = moment().utcOffset(8).format("YYYY-MM-DD HH:mm:ss") // 获取当前日期，格式 YYYY-MM-DD hh:mm:ss
  data.v2ex_posts = PostsData
  return PostsData
}

async function createPostsImg(posts) {
  try {
    console.time("start")
    let promises = posts.map((item) => generateImg(item))
    let i = 0
    for (let promise of promises) {
      let res = await promise
      posts[i].imageUrl = res.realPath
      let sortedData =
        (res.allReplies &&
          res.allReplies.sort((a, b) => b.thankCount - a.thankCount)) ||
        []
      sortedData = sortedData.slice(0, 10)
      posts[i].allReplies = sortedData
      i++
    }
    console.timeEnd("start")
    return posts
  } catch (error) {
    console.error("生成失败:", error)
  }
}

async function renderFile() {
  if (!data.v2ex_posts.length) {
    console.error("暂无数据，稍后再试")
    return
  }
  // 渲染模板
  ejs.renderFile(`${__dirname}/../public/issue.ejs`, data, {}, (err, str) => {
    if (err) {
      console.error("渲染模板出错:", err)
      return
    }
    ejs.renderFile(`${__dirname}/../public/issue.ejs`, data, {}, (err, str) => {
      if (err) {
        console.error("渲染模板出错:", err)
        return
      }
      // 将渲染结果写入github-issue.md文件
      fs.writeFileSync(`github-issue.md`, str, "utf8")
      console.log("GitHub Issue 已生成：github-issue.md")
      return
    })
  })
}

if (require.main === module) {
  ;(async function () {
    try {
      await fetch_posts()
      await renderFile()
      console.log("结束")
    } catch (e) {
      console.log(e)
    }
  })()
}

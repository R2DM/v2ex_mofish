const moment = require("moment")
const nodeHtmlToImage = require("node-html-to-image")
const axios = require("axios")
const cheerio = require("cheerio")
const sharp = require("sharp")
const fs = require("fs")

/**
 * 生成带有评论的图片
 * @param {*} data 传入根据id获取的topics json数据
 * @returns 返回真实图片的地址和所有的评论
 */
const generateImg = async (data, day = "") => {
  let { blockquote, allReplies } = await renderReplies(data.id)
  const newDiv = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>V2EX</title>
    <style>
      html,
      body {
        width: 820px;
        overflow: auto;
        margin: 0;
        padding: 0;
        background: #1c2128
      }
    </style>
  </head>
  <body>
    <div id='image_content' style="width: 820px; color: #adbac7; font-size: 14px; font-family: WenQuanYi Micro Hei, PingFang SC, Arial, Helvetica, sans-serif;">
      <div style="background: #1c2128; padding: 10px;">
        <div style="padding: 15px; background: #22272e; border: 1px solid #6b7280; overflow: hidden; border-radius: 5px;">
          <div style="font-weight: bold; font-size: 18px; line-height: 24px;">V2EX</div>
          <div style="font-weight: bold; margin: 10px 0;">${data.title}</div>
          <div style="padding-left: 5px; padding-right: 5px; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span style="display: inline-flex; align-items: center; vertical-align: middle; width: 24px; height: 24px;">
                <img style="width: 100%; height: 100%;" src="${
                  data.member.avatar_mini
                }">
              </span>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 8px;">${
                data.member.username
              }</span>
            </div>
            <div>
              <span>${moment(data.created * 1000).format(
                "YYYY-MM-DD hh:mm:ss"
              )}</span>
            </div>
          </div>
          <hr
            style="border-color: #6b7280; margin-top: 6px; margin-bottom: 10px; height: 0; color: inherit; border-top-width: 1px;">
          <div style="line-height: 20px;">
            ${data.content}
            ${blockquote}
          </div>
          <div style="text-align: right; padding: 20px 0 0 0; color: rgba(173,186,199,.4);">${
            data.url
          }</div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `
  let now = day
    ? day + '-' + moment().utcOffset(8).format("HHmmss")
    : moment().utcOffset(8).format("YYYY-MM-DD-HHmmss")
  let temporaryPath = `assets/created-images/${now}-${data.id}_old.png`
  let outputPath = `assets/created-images/${now}-${data.id}.png`
  let realPath = `https://raw.githubusercontent.com/Damao2250/v2ex_mofish/main/assets/v2ex/${now}-${data.id}.png`
  await nodeHtmlToImage({
    output: temporaryPath,
    html: newDiv,
  }).then(() => console.log("The image was created successfully!"))
  await sharpImg(temporaryPath, outputPath)
  return { realPath, allReplies }
}

const sharpImg = async (inputPath, outputPath) => {
  await sharp(`${__dirname}/../${inputPath}`)
    .png({ quality: 80 }) // 设置 JPEG 格式，质量为 80%
    .toFile(`${__dirname}/../${outputPath}`, (err, info) => {
      if (err) {
        console.error("压缩失败:", err)
      } else {
        console.log("压缩成功:", info)
      }
      try {
        fs.unlinkSync(`${__dirname}/../${inputPath}`)
        console.log("文件删除成功:", inputPath)
      } catch (err) {
        console.error("删除文件失败:", err)
      }
    })
}

/**
 * 热门评论
 * @param {*} id
 * @returns 返回热门评论html和所有评论
 */
const renderReplies = async (id) => {
  const topicUrl = `https://www.v2ex.com/t/${id}`
  let allReplies = await getAllReplies(topicUrl)
  let sortedData = allReplies.sort((a, b) => b.thankCount - a.thankCount)
  sortedData = sortedData.slice(0, 10)
  let newData = sortedData.map(
    (item) => `
    <blockquote
      style=" background: rgba(6,78,59,.3); padding: 8px; margin: 10px 0px; border-left: 4px solid #047857;">
      <div>${item.content}</div>
      <div style="text-align: right;">
        ${item.replier}&nbsp;&nbsp;&nbsp;&nbsp;${item.replieTime}&nbsp;&nbsp;&nbsp;&nbsp;❤ ${item.thankCount}
      </div>
    </blockquote>
    `
  )
  return { blockquote: newData.join(""), allReplies: allReplies }
}
/**
 * 获取所有回复并支持自动翻页
 * @param {*} topicUrl
 * @returns
 */
const getAllReplies = async (topicUrl) => {
  let allReplies = []
  let currentPage = 1
  let morePages = true

  while (morePages) {
    console.log(`正在抓取第 ${currentPage} 页...`)
    const { replies, nextPageExists } = await getRepliesForPage(
      topicUrl,
      currentPage
    )
    allReplies = allReplies.concat(replies)
    // 判断是否有下一页
    morePages = nextPageExists
    console.log(`是否有下一页：`, morePages)
    if (morePages) {
      currentPage++
    } else {
      break
    }
  }
  return allReplies
}
/**
 * 获取指定页的回复
 * @param {*} topicUrl
 * @param {*} page
 * @returns 返回当前页的评论和是否有下一页
 */
const getRepliesForPage = async (topicUrl, page = 1) => {
  const pageContent = await fetchPageContent(topicUrl, page)
  if (pageContent) {
    const replies = parseReplies(pageContent)
    const nextPageExists = hasMaxPage(pageContent) > page
    return { replies, nextPageExists }
  }

  return { replies: [], nextPageExists: false }
}
/**
 * 或指定页面的html内容
 * @param {*} topicUrl
 * @param {*} page
 * @returns
 */
const fetchPageContent = async (topicUrl, page) => {
  try {
    const response = await axios.get(`${topicUrl}?p=${page}`)
    return response.data
  } catch (error) {
    console.error(`获取页面失败: ${topicUrl}?p=${page}`, error)
    return null
  }
}

// 解析页面，提取回复和感谢数量
const parseReplies = (pageHtml) => {
  const $ = cheerio.load(pageHtml)
  const replies = []

  // 遍历所有回复
  $('[id^="r_"].cell').each((index, element) => {
    const content = $(element).find(".reply_content").text().trim()
    const thankCount = $(element).find(".small.fade").text().trim()
    const replier = $(element).find("strong a.dark").text().trim()
    const replieTime = $(element).find(".ago").attr("title").split(" ")

    // 保存回复内容和感谢数量
    replies.push({
      content: content,
      thankCount: thankCount ? parseInt(thankCount.trim()) : 0,
      replier,
      replieTime: `${replieTime[0]} ${replieTime[1]}`,
    })
  })

  return replies
}

// 判断当前页面是否有“下一页”
const hasMaxPage = (pageHtml) => {
  const $ = cheerio.load(pageHtml)
  let max = $("input.page_input").first().attr("max")
  return max ? parseInt(max) : 1
}

module.exports = {
  generateImg,
}

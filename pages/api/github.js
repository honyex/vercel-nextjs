import fetch from 'node-fetch';
import cheerio from 'cheerio';

/**
 * @param {object} params
 * @param {string} params.user
 */
const fetchHomePage = async ({ user }) => {
  const url = `https://github.com/${user}`;
  const resp = await fetch(url).then((resp) => {
    const { status } = resp;
    if (status >= 200 && status < 300) {
      return resp.text();
    } else {
      return Promise.reject({
        code: status,
        message: status === 404 ? `User ${user} not found` : 'Internal Server Error'
      });
    }
  });
  const $ = cheerio.load(resp);
  const avatar = $('.avatar.avatar-user').attr('src');
  const userID = avatar?.match(/u\/(\d+)?/)?.[1];
  const name = $('.p-name').text().trim();
  const nickname = $('.p-nickname').text().trim();
  const statusIcon = $('.user-status-emoji-container .emoji').attr('src');
  const status = $('.user-status-message-wrapper').first().text().trim();
  const bio = $('.js-user-profile-bio').first().text().trim();
  const $profile = $('.js-profile-editable-area');
  const $counter = $profile.find('a.Link--secondary');
  const followers = Number($counter.eq(0).children('span').text().trim());
  const following = Number($counter.eq(1).children('span').text().trim());
  const stars = Number($counter.eq(2).children('span').text().trim());
  const $nav = $('nav.UnderlineNav-body');
  const repositories = Number($nav.children().eq(1).children('span').text().trim());
  const $container = $('.js-calendar-graph-svg').children().first();
  const count = Number(resp.match(/(\d{1,},*\d*) contributions/)[1].replace(/,/g, ''));
  const contributions = [];
  $container.children().each((index, el) => {
    $(el).children().each((_index, _el) => {
      const $item = $(_el);
      contributions.push({
        date: $item.attr('data-date'),
        count: Number($item.attr('data-count')),
        level: Number($item.attr('data-level'))
      });
    });
  });
  // pinned
  const $pinned = $('ol.js-pinned-items-reorder-list');
  const pinned = [];
  $pinned.children().map((index, el) => {
    const $item = $(el).find('.pinned-item-list-item-content');
    const repo = $item.find('span.repo').text().trim();
    const description = $item.children('.pinned-item-desc').text().trim();
    const languageColor = $item.find('.repo-language-color').attr('style')?.match(/background-color: (#\w*);*/)[1];
    const language = $item.find('.repo-language-color').next().text().trim();
    const $bt = $item.children().eq(2);
    const stargazers = Number($bt.children().eq(1).text().trim());
    const forks = Number($bt.children().eq(2).text().trim());

    const item = {
      repo,
      description,
      language,
      language_color: languageColor,
      stargazers,
      forks
    };
    pinned.push(item);
  });
  return {
    user_id: userID,
    avatar,
    name,
    nickname,
    status_icon: statusIcon,
    status,
    bio,
    followers,
    following,
    stars,
    repositories,
    pinned,
    contributions_count: count,
    contributions
  };
};

export default async (req, res) => {
  if (!req.query.user) {
    res.statusCode = 400;
    res.json({
      message: 'Missing parameter "user"'
    });
  }
  try {
    const resp = await fetchHomePage(req.query);
    res.statusCode = 200;
    res.json(resp);
  } catch (e) {
    res.statusCode = e.code;
    res.json({
      message: e.message
    });
  }
}

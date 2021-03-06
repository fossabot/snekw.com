/**
 *  snekw.com,
 *  Copyright (C) 2017 Ilkka Kuosmanen
 *
 *  This file is part of snekw.com.
 *
 *  snekw.com is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  snekw.com is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with snekw.com.  If not, see <http://www.gnu.org/licenses/>.
 */
'use strict';
const router = require('express').Router();
const HbsViews = require('../hbsSystem').views;
const models = require('../../db/models.js');
const cachedData = require('../../db/CachedData');
const querys = require('../../db/querys');
const articleLib = require('../../lib/articleLib');
const config = require('../../helpers/configStub')('main');

const defaultPage = 0;
const defaultCount = 10;

// TODO: Seriously this needs to be refactored. This is awful.
// Still needs some more work 1.12.2017
function getArchive (req, res, next) {
  if (!req.params.page) {
    req.params.page = defaultPage;
  } else {
    req.params.page = parseInt(req.params.page);
  }
  if (!req.params.count) {
    req.params.count = defaultCount;
  } else {
    req.params.count = parseInt(req.params.count);
  }

  cachedData.getCachedOrDb(cachedData.keys.articleCount, querys.getArticleCount)
    .then(count => {
      // Pagination
      // Determine needed page numbers
      let page = req.params.page;
      let dcount = req.params.count;
      let pages = [page - 2, page - 1, page, page + 1, page + 2];
      let actualPages = [];
      for (let i = 0; i < pages.length; i++) {
        // If the page is larger than -1 and the count of
        // items is not larger than display count for that page
        if (pages[i] > -1 && pages[i] * dcount <= count) {
          actualPages.push(pages[i]);
        }
      }
      req.context.pagination = [];
      // Determine if we need the 'First' or 'Previous' buttons
      let disabled = actualPages[0] === page;
      let firstHref = '0-' + dcount.toString();
      let previousHref = (page - 1).toString() + '-' + dcount.toString();
      if (disabled) {
        firstHref = '';
        previousHref = '';
      }
      req.context.pagination = [
        {
          page: 'First',
          href: firstHref,
          disabled: disabled
        }, {
          page: 'Previous',
          href: previousHref,
          disabled: disabled
        }];
      for (let i = 0; i < actualPages.length; i++) {
        let href = actualPages[i].toString() + '-' + dcount.toString();
        let active = false;
        if (page === actualPages[i]) {
          active = true;
        }
        req.context.pagination.push({page: actualPages[i], href: href, active: active});
      }

      // Determine if we need the 'Next' or 'Last' buttons
      disabled = actualPages[actualPages.length - 1] === page;
      firstHref = (page + 1).toString() + '-' + dcount.toString();
      previousHref = Math.trunc(count / dcount).toString() + '-' + dcount.toString();
      if (disabled) {
        firstHref = '';
        previousHref = '';
      }
      let temp = [
        {
          page: 'Next',
          href: firstHref,
          disabled: disabled
        }, {
          page: 'Last',
          href: previousHref,
          disabled: disabled
        }];
      req.context.pagination = req.context.pagination.concat(temp);
    })
    .then(() => {
      let q = {public: 1};
      if (req.user && req.user.app_metadata && req.user.app_metadata.admin === true) {
        q = {$or: [{public: 1}, {public: 2}]};
      }
      return models.article.find(q)
        .skip(req.params.page * req.params.count)
        .limit(req.params.count)
        .sort('-postedAt')
        .lean()
        .select('postedAt updatedAt author brief title indexImagePath public')
        .exec();
    })
    .then(data => {
      if (data) {
        req.context.articles = data;
        req.template = HbsViews.archive.get;
        req.context.title = articleLib.createTitle('Archive');
        req.context.meta.description = config.siteArchiveBrief || '';
        return next();
      } else {
        return next(new Error('There seems to be no articles?'));
      }
    })
    .catch(err => {
      return next(err);
    });
}

router.get('/', getArchive);

router.get('/:page-:count', getArchive);

module.exports = router;

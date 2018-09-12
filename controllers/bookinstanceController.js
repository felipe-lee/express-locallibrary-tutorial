var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');
const {body, validationResult} = require('express-validator/check');
const {sanitizeBody} = require('express-validator/filter');
var async = require('async');

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res) {
  BookInstance.find()
    .populate('book')
    .exec(function (err, list_bookinstances) {
      if (err) {
        return next(err);
      }

      res.render('bookinstance_list', {title: 'Book Instance List', bookinstance_list: list_bookinstances})
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookinstance) {
      if (err) {
        return next(err);
      }

      if (bookinstance === null) {  // No results
        let notFoundErr = new Error('Book copy not found');
        notFoundErr.status = 404;

        return next(notFoundErr);
      }

      // Successful, so render
      res.render('bookinstance_detail', {title: 'Book', bookinstance: bookinstance});
    })
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {
  Book.find({}, 'title')
    .sort([['title', 'ascending']])
    .exec(function (err, books) {
      if (err) {
        return next(err);
      }
      // Successful, so render.
      res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books});
    });
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
  // Validate fields.
  body('book', 'Book must be specified').isLength({min: 1}).trim(),
  body('imprint', 'Imprint must be specified').isLength({min: 1}).trim(),
  body('due_back', 'Invalid date').optional({checkFalsy: true}).isISO8601(),

  // Sanitize fields.
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped and trimmed data.
    var bookinstance = new BookInstance(
      {
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back
      });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, 'title')
        .sort([['title', 'ascending']])
        .exec(function (err, books) {
          if (err) {
            return next(err);
          }
          // Successful, so render.
          res.render('bookinstance_form', {
            title: 'Create BookInstance',
            book_list: books,
            errors: errors.array(),
            bookinstance: bookinstance
          });
        });
    } else {
      // Data from form is valid.
      bookinstance.save(function (err) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to new record.
        res.redirect(bookinstance.url);
      });
    }
  }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {
  BookInstance.findById(req.params.id)
    .populate('book')
    .exec(function (err, bookInstance) {
      if (err) {
        return next(err);
      }

      // No book copy found. Don't know what book they were looking at so just send to general book list
      if (bookInstance === null) {
        res.redirect('/catalog/books');
      }

      res.render('bookinstance_delete', {title: 'Delete Book Copy', bookinstance: bookInstance});
    });
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res, next) {
  BookInstance.findById(req.body.bookinstanceid)
    .populate('book')
    .exec(function (err, bookInstance) {
      if (err) {
        return next(err);
      }

      // Delete book instance and redirect to book details
      bookInstance.remove(function deleteBookInstance(err) {
        if (err) {
          return next(err);
        }

        res.redirect(bookInstance.book.url);
      });
    });
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res, next) {
  async.parallel({
    bookinstance: function (callback) {
      BookInstance.findById(req.params.id)
        .exec(callback);
    },
    book_list: function (callback) {
      Book.find({}, 'title')
        .sort([['title', 'ascending']])
        .exec(callback)
    }
  }, function (err, results) {
    if (err) {
      return next(err);
    }

    if (results.bookinstance === null) {  // No results
      let notFoundErr = new Error('Book copy not found');
      notFoundErr.status = 404;

      return next(notFoundErr);
    }

    res.render('bookinstance_form', {
      title: 'Update BookInstance',
      bookinstance: results.bookinstance,
      book_list: results.book_list
    });
  })
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
  // Validate fields.
  body('book', 'Book must be specified').isLength({min: 1}).trim(),
  body('imprint', 'Imprint must be specified').isLength({min: 1}).trim(),
  body('due_back', 'Invalid date').optional({checkFalsy: true}).isISO8601(),

  // Sanitize fields.
  sanitizeBody('book').trim().escape(),
  sanitizeBody('imprint').trim().escape(),
  sanitizeBody('status').trim().escape(),
  sanitizeBody('due_back').toDate(),

  // Process request after validation and sanitization.
  (req, res, next) => {

    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a BookInstance object with escaped/trimmed data and old id.
    var bookinstance = new BookInstance(
      {
        book: req.body.book,
        imprint: req.body.imprint,
        status: req.body.status,
        due_back: req.body.due_back,
        _id: req.params.id, // This is required, or a new ID will be assigned!
      });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values and error messages.
      Book.find({}, 'title')
        .sort([['title', 'ascending']])
        .exec(function (err, books) {
          if (err) {
            return next(err);
          }
          // Successful, so render.
          res.render('bookinstance_form', {
            title: 'Create BookInstance',
            book_list: books,
            errors: errors.array(),
            bookinstance: bookinstance
          });
        });
    } else {
      // Data from form is valid. Update the record.
      BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err, updatedBookInstance) {
        if (err) {
          return next(err);
        }
        // Successful - redirect to book detail page.
        res.redirect(updatedBookInstance.url);
      });
    }
  }
];
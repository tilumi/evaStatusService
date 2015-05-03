# -*- coding:gb2312 -*-
# -*- coding:UTF-8 -*-
import os

__author__ = 'jimmy'

import urllib
import urllib2
import cookielib
import re
import json
import BeautifulSoup
from pattern import web
import inspect
from dateutil.parser import parse
import difflib
import os
import sqlite3
from flask import render_template, request, session, redirect, url_for, flash, Flask
import sys

diff = difflib.Differ()
app = Flask(__name__)
db_file_path = 'cache/user_db.sqlite3'


def lineno():
    """Returns the current line number in our program."""
    return inspect.currentframe().f_back.f_lineno


def createRequest(url, body=None):
    # print body
    if body != None:
        body = urllib.urlencode(body)
    req = (urllib2.Request(url, body))
    req.add_header('User-agent',
                   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/37.0.2062.120 Chrome/37.0.2062.120 Safari/537.36')
    return req


def get_tables(html):
    """Parse html and return html tables of wikipedia population data."""

    dom = web.Element(html)

    # ## 0. step: look at html source!
    # ### 1. step: get all tables
    # tbls = dom('table')
    # ### 2. step: get all tables we care about
    tbls = dom.by_class('collapse1')
    # href = tbls.by_class('thumbnail')
    return tbls


def getinfo(x, httpClient):
    fishProfileRequest = createRequest('https://ms.tcgm.tw/FishBox/manage_display/show_fishStudyInfo/', {'fish_id': x})
    fishProfileResponse = httpClient.open(fishProfileRequest)
    fishProfileResponseString = fishProfileResponse.read()
    profilesoup = BeautifulSoup.BeautifulSoup(fishProfileResponseString)

    # div = profilesoup.findAll("div" , {'class' : 'span3 lightblue'})
    div = profilesoup.findAll('label')
    # print div
    str = div[1].text.encode('unicode-escape')
    list = str.split(":")
    if list[1].decode('unicode-escape') == u'\u7537':
        gender = True
    else:
        gender = False

    str = div[3].text.encode('unicode-escape')
    list = str.split(":")
    depart = list[1].decode('unicode-escape')
    # print depart

    tag = profilesoup.findAll('h3')
    name = tag[0].text
    # print name
    order = 0
    if depart == u'\u570b\u9ad8\u4e2d\u90e8' and gender == True:
        order = 1
    elif depart == u'\u570b\u9ad8\u4e2d\u90e8' and gender == False:
        order = 2
    elif depart == u'\u5927\u5b78\u90e8' and gender == True:
        order = 3
    elif depart == u'\u5927\u5b78\u90e8' and gender == False:
        order = 4
    elif depart == u'\u9752\u5e74\u90e8' and gender == True:
        order = 5
    elif depart == u'\u9752\u5e74\u90e8' and gender == False:
        order = 6
    elif depart == u' \u9577\u5e74\u90e8' and gender == True:
        order = 7
    elif depart == u' \u9577\u5e74\u90e8' and gender == False:
        order = 8

    array = []
    for td_tag in profilesoup.findAll('td'):
        array.append(td_tag.text)

    lecture = []
    date = []
    lecturer = []
    condition = []
    leclist = []
    i = 0
    j = 0
    while i < len(array):
        if j == 0:
            if array[i] == u'\u8056\u7d93\u6642\u89c0':
                j = 1
            else:
                i = i + 1

        if j == 1:
            if array[i] == u'\u5176\u4ed6':
                i = len(array)
                break
            if array[i + 1] == u'':
                lecture.append(array[i])
                date.append(u'0')
                lecturer.append(u'0')
                condition.append(u'0')
                i = i + 2
            else:
                lecture.append(array[i])
                a = array[i + 1].decode('unicode-escape').replace("-0", "/").replace("-", "/")
                a = a + 'T08'
                try:
                    a = int(parse(a).strftime('%s'))
                except:
                    a = 0
                # print(a)
                date.append(a)
                lecturer.append(array[i + 2])
                condition.append(array[i + 3])
                leclist.append([array[i], a, array[i + 2]])
                i = i + 5

    result = {"name": name, "gender": gender, "depart": depart, "order": order, "lessons": leclist}
    return result


def do_login(username, password, http_client):
    loginPost = 'https://ms.tcgm.tw/welcome/login'
    loginParameterMap = {'account': username,
                         'pwd': password}
    loginPostRequest = createRequest(loginPost, loginParameterMap)
    loginPostResponse = http_client.open(loginPostRequest)
    loginPostResponseString = loginPostResponse.read()
    if 'login' not in loginPostResponseString:
        return str(True)
    else:
        return str(False)


def get_all_users():
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('SELECT username, password FROM users')
    records = cursor.fetchall()
    result = []
    for record in records:
        result.append({'username': record[0], 'password': record[1]})
    cursor.close()
    conn.close()
    return result


@app.route("/load_all_eva_status")
def load_all_eva_status():
    all_users = get_all_users()
    for user in all_users:
        load_eva_status(user['username'], user['password'])
    return str(True)


@app.route("/load_eva_status")
def load_eva_status(username, password):
    cookie_store = cookielib.CookieJar()
    http_client = urllib2.build_opener(urllib2.HTTPCookieProcessor(cookie_store))
    do_login(username, password, http_client)

    print('Logged in!')
    fishListPageRequest = createRequest('http://ms.tcgm.tw/FishBox/manage_display/show_fishList')
    fishListPageResponse = http_client.open(fishListPageRequest)
    fishPageResponseString = fishListPageResponse.read()
    print('List got')

    soup = BeautifulSoup.BeautifulSoup(fishPageResponseString)
    learninglist = soup.find(id='collapse1')
    href = learninglist.findAll('a', attrs={'href': re.compile("^javascript:formSubmit")})
    print('List content parsed!')

    regex = re.compile("formSubmit\(([0-9]+)\)")

    fishMap = []

    for line in href:
        matches = regex.search(line.__repr__())
        if matches is not None:
            fishMap.append(matches.group(1))

    getfishinfo = []

    for i in fishMap:
        a = getinfo(i, http_client)
        getfishinfo.append(a)

    old_fish_list = ''
    with open("cache/data.json", "r") as fish_list_cache_file:
        old_fish_list = fish_list_cache_file.read()

    fish_list = json.dumps(getfishinfo)

    if not os.path.exists('cache/' + username):
        os.makedirs('cache/' + username)

    with open('cache/' + username + '/data.json', "w") as fish_list_cache_file:
        fish_list_cache_file.write(fish_list)

    return 'success'


def init_db():
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE users (username TEXT, password TEXT)')
    cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS users.unique_username ON users (username)')
    conn.commit()
    conn.close()


def get_password(username):
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('SELECT password FROM users WHERE username = ?', (username,))
    password = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return password


def insert_or_update_user(username, password):
    if not os.path.exists(db_file_path):
        init_db()
    conn = sqlite3.connect(db_file_path)
    cursor = conn.cursor()
    cursor.execute('REPLACE INTO users (username, password) VALUES (?, ?)', (username, password))
    cursor.close()
    conn.commit()
    conn.close()


@app.route("/get_eva_status")
def get_eva_status():
    username = request.args['username']
    fish_list = ''
    cache_file_path = 'cache/' + username + '/data.json'
    print cache_file_path
    if not os.path.exists(cache_file_path):
        password = get_password(username)
        load_eva_status(username, password)
    with open(cache_file_path, "r") as fish_list_cache_file:
        fish_list = fish_list_cache_file.read()
    return fish_list


@app.route("/eva_status/index.html")
def show_eva_status():
    if session['username']:
        return render_template('eva_status/index.html', username=session['username'])
    else:
        return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        cookie_store = cookielib.CookieJar()
        http_client = urllib2.build_opener(urllib2.HTTPCookieProcessor(cookie_store))
        is_login_success = do_login(username, password, http_client)
        if is_login_success:
            session['username'] = username
            insert_or_update_user(username, password)
            return redirect(url_for('show_eva_status'))
        else:
            error = 'Invalid username or password'
    return render_template('users/login.html', error=error)


@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))


app.secret_key = 'A0Zr98j/3yX R~XHH!jmN]LWX/,?RT'

from tornado.wsgi import WSGIContainer
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop

cmd = sys.argv[1]

if cmd == 'server':
    pid = os.getpid()
    print "Running server at process " + str(pid)
    http_server = HTTPServer(WSGIContainer(app))
    http_server.listen(5000)
    IOLoop.instance().start()
elif cmd == 'load':
    load_all_eva_status()

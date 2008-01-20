# Rakefile for building flickr2blog package
require 'rake/clean'

package_name = 'flickr2blog.tar.gz'
excludes = [".svn", "Rakefile", package_name]

CLOBBER.include(package_name)

desc 'Same for package'
task :default => :package

desc 'Make flickr2blog package'
task :package => [:update, package_name]

desc 'Update files from Subversion Repository'
task :update do |t|
  sh "svn update"
end

desc 'Packaged flickr2blog files'
file package_name => FileList["./**/*"] do |t|
  sh "tar czf #{package_name} . " + excludes.map{|f| "--exclude #{f}"}.join(' ')
end

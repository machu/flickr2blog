# Rakefile for building flickr2blog package
require 'rake/packagetask'

package = {
  :name => 'flickr2blog',
  :rev => :noversion
}

desc 'update source and packaging'
task :default => [:update, :package]

desc 'Update files from Subversion Repository'
task :update do |t|
  sh "svn update"
end

Rake::PackageTask.new(package[:name], package[:rev]) do |p|
  p.package_dir = 'package'
  p.package_files.include('**/*')
  p.package_files.exclude('package')
  p.package_files.exclude('Rakefile')
  p.need_tar_gz  = true
end
